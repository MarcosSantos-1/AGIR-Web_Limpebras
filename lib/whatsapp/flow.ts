import {
  isSolicitacaoTipo,
  solicitacaoPrazoLabel,
  solicitacaoTipoLabel,
  solicitacaoUrgenciaLabel,
  type SolicitacaoPrazoTipo,
  type SolicitacaoUrgencia,
} from "@/data/solicitacoes";
import { createSolicitacao } from "@/lib/firestore/solicitacoes-admin";
import {
  clearSession,
  readContact,
  readSession,
  writeContact,
  writeSession,
} from "@/lib/firestore/whatsapp-sessions";
import { sendButtons, sendList, sendText } from "@/lib/whatsapp/client";
import {
  isSessionExpired,
  type FlowStep,
  type SolicitacaoDraft,
  type WhatsAppSession,
} from "@/lib/whatsapp/session-state";
import type { NormalizedInbound } from "@/lib/whatsapp/types";

/**
 * Máquina de estados do canal de solicitações.
 *
 * Cada mensagem recebida é interpretada à luz do `step` guardado em
 * `whatsappSessions`. Todas as perguntas fechadas usam listas ou botões
 * interativos, para que a resposta volte como um ID estável em vez de texto
 * livre — só a descrição e a identificação são digitadas.
 */

const RESET_COMMANDS = new Set([
  "menu",
  "início",
  "inicio",
  "começar",
  "comecar",
  "recomeçar",
  "recomecar",
  "oi",
  "olá",
  "ola",
  "bom dia",
  "boa tarde",
  "boa noite",
]);

const CANCEL_COMMANDS = new Set(["cancelar", "sair", "parar", "desistir"]);

const DESCRICAO_MIN_CHARS = 10;

const PRAZO_OPTIONS: Array<{
  id: SolicitacaoPrazoTipo;
  title: string;
  description: string;
}> = [
  { id: "hoje", title: "Para hoje", description: "Preciso ainda hoje" },
  { id: "semana", title: "Esta semana", description: "Nos próximos dias" },
  { id: "data", title: "Data específica", description: "Vou informar o dia" },
  {
    id: "sem_prazo",
    title: "Sem prazo",
    description: "Pode ser encaixado na fila",
  },
];

/** Títulos curtos porque a Meta limita cada linha da lista a 24 caracteres. */
const TIPO_ROWS: Array<{ id: string; title: string; description: string }> = [
  {
    id: "arte-grafica",
    title: "Arte gráfica",
    description: "Cartaz, banner, folheto, post",
  },
  {
    id: "campanha",
    title: "Campanha",
    description: "Ação de comunicação completa",
  },
  { id: "mural", title: "Mural", description: "Mural interno ou informativo" },
  {
    id: "prefeitura",
    title: "Prefeitura",
    description: "Solicitação vinda da Prefeitura",
  },
  {
    id: "cobertura-evento",
    title: "Cobertura de evento",
    description: "Fotos e registro no local",
  },
  {
    id: "redes-sociais",
    title: "Redes sociais",
    description: "Publicação nos perfis",
  },
  { id: "outro", title: "Outro", description: "Descrevo na próxima mensagem" },
];

export async function handleInboundMessage(
  inbound: NormalizedInbound,
): Promise<void> {
  const phone = inbound.from;

  if (inbound.unsupported) {
    await sendText(
      phone,
      "Consigo ler texto e as opções dos menus. Se enviou áudio, foto ou " +
        "figurinha, escreva a informação em texto — ou digite *menu* para " +
        "recomeçar.",
    );
    return;
  }

  const normalizedText = inbound.text.trim();
  const command = normalizedText.toLowerCase();

  if (CANCEL_COMMANDS.has(command)) {
    await clearSession(phone);
    await sendText(
      phone,
      "Solicitação cancelada, nada foi registrado. Quando quiser abrir outra, " +
        "envie *menu*.",
    );
    return;
  }

  const stored = await readSession(phone);
  const session =
    stored && !isSessionExpired(stored) && !RESET_COMMANDS.has(command)
      ? stored
      : null;

  if (!session) {
    await startFlow(phone, inbound.profileName);
    return;
  }

  await advance(phone, session, inbound, normalizedText);
}

async function startFlow(phone: string, profileName?: string): Promise<void> {
  const contact = await readContact(phone);
  const saudacao = contact?.nome
    ? `Olá, ${firstName(contact.nome)}!`
    : profileName
      ? `Olá, ${firstName(profileName)}!`
      : "Olá!";

  await sendText(
    phone,
    `${saudacao} Aqui é o canal de solicitações do *Departamento de ` +
      "Comunicação*. Vou fazer algumas perguntas rápidas para registrar o seu " +
      "pedido com prazo e prioridade.\n\nA qualquer momento envie *menu* para " +
      "recomeçar ou *cancelar* para desistir.",
  );

  await askTipo(phone);
  await saveSession(phone, "aguardando_tipo", {});
}

async function advance(
  phone: string,
  session: WhatsAppSession,
  inbound: NormalizedInbound,
  text: string,
): Promise<void> {
  const draft = session.draft ?? {};

  switch (session.step) {
    case "aguardando_tipo": {
      const tipo = optionId(inbound.replyId, "tipo");
      if (!tipo || !isSolicitacaoTipo(tipo)) {
        await sendText(
          phone,
          "Escolha uma das opções da lista para eu classificar o pedido.",
        );
        await askTipo(phone);
        return;
      }
      await sendText(
        phone,
        `Anotado: *${solicitacaoTipoLabel(tipo)}*.\n\nAgora descreva o que ` +
          "você precisa, com o máximo de detalhe possível (o que é, para quem, " +
          "onde vai ser usado).",
      );
      await saveSession(phone, "aguardando_descricao", { ...draft, tipo });
      return;
    }

    case "aguardando_descricao": {
      if (text.length < DESCRICAO_MIN_CHARS) {
        await sendText(
          phone,
          "Preciso de um pouco mais de detalhe para a equipe entender o " +
            "pedido. Escreva em uma mensagem o que você precisa.",
        );
        return;
      }
      await saveSession(phone, "aguardando_prazo", {
        ...draft,
        descricao: text,
      });
      await askPrazo(phone);
      return;
    }

    case "aguardando_prazo": {
      const prazo = optionId(inbound.replyId, "prazo");
      if (!prazo || !isPrazoTipo(prazo)) {
        await sendText(phone, "Escolha um dos prazos da lista.");
        await askPrazo(phone);
        return;
      }
      if (prazo === "data") {
        await saveSession(phone, "aguardando_data", {
          ...draft,
          prazoTipo: prazo,
        });
        await sendText(
          phone,
          "Para qual dia você precisa? Envie no formato *DD/MM* " +
            "(por exemplo 04/09).",
        );
        return;
      }
      await saveSession(phone, "aguardando_urgencia", {
        ...draft,
        prazoTipo: prazo,
        prazoData: undefined,
      });
      await askUrgencia(phone);
      return;
    }

    case "aguardando_data": {
      const iso = parsePrazoData(text);
      if (!iso) {
        await sendText(
          phone,
          "Não consegui entender a data. Envie no formato *DD/MM*, " +
            "por exemplo 04/09.",
        );
        return;
      }
      await saveSession(phone, "aguardando_urgencia", {
        ...draft,
        prazoTipo: "data",
        prazoData: iso,
      });
      await askUrgencia(phone);
      return;
    }

    case "aguardando_urgencia": {
      const urgencia = optionId(inbound.replyId, "urgencia");
      if (!urgencia || !isUrgencia(urgencia)) {
        await sendText(phone, "Toque em um dos botões de prioridade.");
        await askUrgencia(phone);
        return;
      }
      const nextDraft = { ...draft, urgencia };
      const contact = await readContact(phone);
      if (contact?.nome && contact.setor) {
        await saveSession(phone, "aguardando_confirmacao", {
          ...nextDraft,
          nome: contact.nome,
          setor: contact.setor,
        });
        await askConfirmacao(phone, {
          ...nextDraft,
          nome: contact.nome,
          setor: contact.setor,
        });
        return;
      }
      await saveSession(phone, "aguardando_nome", nextDraft);
      await sendText(
        phone,
        "Como é o seu nome completo? (pergunto só nesta primeira vez)",
      );
      return;
    }

    case "aguardando_nome": {
      if (text.length < 3) {
        await sendText(phone, "Envie o seu nome completo, por favor.");
        return;
      }
      await saveSession(phone, "aguardando_setor", { ...draft, nome: text });
      await sendText(
        phone,
        "E de qual setor ou departamento você fala? (ex.: Operações, RH, " +
          "Diretoria)",
      );
      return;
    }

    case "aguardando_setor": {
      if (text.length < 2) {
        await sendText(phone, "Envie o nome do seu setor, por favor.");
        return;
      }
      const nextDraft = { ...draft, setor: text };
      await saveSession(phone, "aguardando_confirmacao", nextDraft);
      await askConfirmacao(phone, nextDraft);
      return;
    }

    case "aguardando_confirmacao": {
      const action = optionId(inbound.replyId, "conf");
      if (action === "recomecar") {
        await startFlow(phone, inbound.profileName);
        return;
      }
      if (action === "cancelar") {
        await clearSession(phone);
        await sendText(
          phone,
          "Solicitação descartada, nada foi registrado. Envie *menu* quando " +
            "quiser abrir outra.",
        );
        return;
      }
      if (action !== "confirmar") {
        await sendText(phone, "Toque em um dos botões para finalizar.");
        await askConfirmacao(phone, draft);
        return;
      }
      await finalize(phone, draft, inbound.profileName);
      return;
    }

    default: {
      await startFlow(phone, inbound.profileName);
    }
  }
}

async function finalize(
  phone: string,
  draft: SolicitacaoDraft,
  profileName?: string,
): Promise<void> {
  const complete = requireComplete(draft);
  if (!complete) {
    await sendText(
      phone,
      "Perdi parte das informações no caminho. Vamos recomeçar do início.",
    );
    await startFlow(phone, profileName);
    return;
  }

  await writeContact(phone, {
    nome: complete.nome,
    setor: complete.setor,
    profileName,
  });

  const { protocolo } = await createSolicitacao({
    tipo: complete.tipo,
    descricao: complete.descricao,
    prazoTipo: complete.prazoTipo,
    prazoData: complete.prazoData,
    urgencia: complete.urgencia,
    solicitanteNome: complete.nome,
    solicitanteSetor: complete.setor,
    solicitanteTelefone: phone,
    canal: "whatsapp",
  });

  await clearSession(phone);

  await sendText(
    phone,
    `Registrado! Protocolo *${protocolo}*.\n\nA solicitação já apareceu no ` +
      "painel do Departamento de Comunicação com o prazo e a prioridade que " +
      "você informou. Guarde o protocolo para acompanhar.\n\nPara abrir outra " +
      "solicitação, envie *menu*.",
  );
}

async function askTipo(phone: string): Promise<void> {
  await sendList(phone, {
    header: "Tipo de solicitação",
    body: "O que você precisa do Departamento de Comunicação?",
    buttonLabel: "Ver opções",
    sectionTitle: "Tipos",
    rows: TIPO_ROWS.map((row) => ({
      id: `tipo:${row.id}`,
      title: row.title,
      description: row.description,
    })),
  });
}

async function askPrazo(phone: string): Promise<void> {
  await sendList(phone, {
    header: "Prazo",
    body: "Para quando você precisa?",
    buttonLabel: "Escolher prazo",
    sectionTitle: "Prazos",
    rows: PRAZO_OPTIONS.map((option) => ({
      id: `prazo:${option.id}`,
      title: option.title,
      description: option.description,
    })),
  });
}

async function askUrgencia(phone: string): Promise<void> {
  await sendButtons(
    phone,
    "Qual a prioridade desta solicitação?",
    [
      { id: "urgencia:alta", title: "Alta" },
      { id: "urgencia:media", title: "Média" },
      { id: "urgencia:baixa", title: "Baixa" },
    ],
    "Alta é para o que trava outra entrega",
  );
}

async function askConfirmacao(
  phone: string,
  draft: SolicitacaoDraft,
): Promise<void> {
  await sendButtons(phone, resumo(draft), [
    { id: "conf:confirmar", title: "Confirmar" },
    { id: "conf:recomecar", title: "Recomeçar" },
    { id: "conf:cancelar", title: "Cancelar" },
  ]);
}

function resumo(draft: SolicitacaoDraft): string {
  const linhas = [
    "*Confira antes de enviar:*",
    "",
    `*Tipo:* ${draft.tipo ? solicitacaoTipoLabel(draft.tipo) : "—"}`,
    `*Prazo:* ${
      draft.prazoTipo
        ? solicitacaoPrazoLabel(draft.prazoTipo, draft.prazoData)
        : "—"
    }`,
    `*Prioridade:* ${
      draft.urgencia ? solicitacaoUrgenciaLabel(draft.urgencia) : "—"
    }`,
    `*Solicitante:* ${draft.nome ?? "—"} — ${draft.setor ?? "—"}`,
    "",
    `*Descrição:* ${draft.descricao ?? "—"}`,
  ];
  return linhas.join("\n");
}

type CompleteDraft = {
  tipo: NonNullable<SolicitacaoDraft["tipo"]>;
  descricao: string;
  prazoTipo: SolicitacaoPrazoTipo;
  prazoData?: string;
  urgencia: SolicitacaoUrgencia;
  nome: string;
  setor: string;
};

function requireComplete(draft: SolicitacaoDraft): CompleteDraft | null {
  const { tipo, descricao, prazoTipo, urgencia, nome, setor } = draft;
  if (!tipo || !descricao || !prazoTipo || !urgencia || !nome || !setor) {
    return null;
  }
  return {
    tipo,
    descricao,
    prazoTipo,
    prazoData: draft.prazoData,
    urgencia,
    nome,
    setor,
  };
}

async function saveSession(
  phone: string,
  step: FlowStep,
  draft: SolicitacaoDraft,
): Promise<void> {
  const clean: SolicitacaoDraft = {};
  for (const [key, value] of Object.entries(draft)) {
    if (value !== undefined) {
      (clean as Record<string, unknown>)[key] = value;
    }
  }
  await writeSession(phone, { step, draft: clean, updatedAtMs: Date.now() });
}

/** `tipo:arte-grafica` com prefixo `tipo` devolve `arte-grafica`. */
function optionId(replyId: string | undefined, prefix: string): string | null {
  if (!replyId) return null;
  const marker = `${prefix}:`;
  if (!replyId.startsWith(marker)) return null;
  return replyId.slice(marker.length) || null;
}

function isPrazoTipo(value: string): value is SolicitacaoPrazoTipo {
  return (
    value === "hoje" ||
    value === "semana" ||
    value === "data" ||
    value === "sem_prazo"
  );
}

function isUrgencia(value: string): value is SolicitacaoUrgencia {
  return value === "alta" || value === "media" || value === "baixa";
}

/**
 * Aceita `DD/MM`, `DD/MM/AAAA` e `DD-MM`. Sem ano, assume o ano corrente e
 * salta para o próximo se a data já passou.
 */
function parsePrazoData(text: string): string | null {
  const match = /^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2}|\d{4}))?$/.exec(
    text.trim(),
  );
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  const now = new Date();
  let year = now.getFullYear();
  if (match[3]) {
    const raw = Number(match[3]);
    year = raw < 100 ? 2000 + raw : raw;
  }

  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  if (!match[3]) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (candidate < today) {
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
