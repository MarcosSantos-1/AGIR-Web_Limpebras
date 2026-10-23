"""Build versioned JSON sources and field metadata; never changes XLSX files."""
import datetime
import hashlib
import json
import pathlib
import re
import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'diagnosticos'
OUT.mkdir(exist_ok=True)
KEYS = 'codigo subprefeitura sigla distrito dataChecagem antiguidade statusTrimestral revitalizacao coleta limpezas endereco complemento latitude longitude lote tipoLogradouro outroLogradouro topografia ocupacao entornoBueiro entornoRio entornoEncosta entornoTerreno entornoSemSaida entornoMuro volume residuoDomiciliar residuoEntulho residuoMoveis origemResidentes origemPequenosTransportadores origemCacambeiros origemGrandesTransportadores origemGrandesGeradores riscoAves riscoInsetos riscoPeconhentos riscoRoedores riscoAgua riscoOdor riscoQueimada riscoErosao impactoPedestres impactoVeiculos proximidadeConteiner proximidadePlaca proximidadeCatadores proximidadeCirculacaoRua proximidadeFixacaoRua'.split()
LABELS = 'Código do ponto|Subprefeitura|Sigla|Distrito|Data da checagem|Ponto antigo ou novo no trimestre|Atividade durante o trimestre|Revitalização no trimestre|Coleta predominante no trimestre|Operações de limpeza no trimestre|Endereço|Complemento e referência|Latitude|Longitude|Lote|Tipo de logradouro|Especifique o outro tipo|Topografia|Perfil de ocupação|Bocas de lobo / bueiros|Córregos / rios|Encostas / morros|Terrenos baldios|Ruas sem saída|Gradeado / muro cego|Faixa de volume|Resíduo domiciliar|Entulho|Móveis / grandes objetos|Residentes / transeuntes|Pequenos transportadores / carroceiros|Caçambeiros|Transportadores de grandes volumes|Grandes geradores|Aves|Insetos|Animais peçonhentos|Roedores|Acúmulo de água|Mau cheiro|Vestígios de queimadas|Erosão / danos na calçada ou via|Impacto na circulação de pedestres|Impacto no tráfego de veículos|Contêiner da concessionária|Placa / pintura contra descarte|Circulação de catadores|Circulação de pessoas em situação de rua|Fixação de pessoas em situação de rua'.split('|')
OPTION_COL = [None,0,1,None,None,2,3,4,5,None,None,None,None,None,7,8,None,9,10]+[11]*6+[12]+[13]*3+[14]*5+[15]*8+[16,17]+[18]*5
sources = []
all_records = []
fields = []
for i,path in enumerate(sorted((ROOT/'data'/'Diagnósticos').rglob('*.xlsx'))):
    book = openpyxl.load_workbook(path, read_only=True, data_only=True)
    s,v = book.worksheets[:2]
    raw = list(s.values)
    lists = list(v.values)
    options = [[r[c] for r in lists[2:] if len(r)>c and r[c] is not None] for c in range(19)]
    source_id = ['2025-T3','2025-T4','2026-T1','2026-T2','2026-T3','2026-T3-rev-20261019'][i]
    period = ['2025-T3','2025-T4','2026-T1','2026-T2','2026-T3','2026-T3'][i]
    records, issues = [], []
    seen = set()
    sha = hashlib.sha256(path.read_bytes()).hexdigest()
    for rownum,row in enumerate(raw[2:],3):
        if not isinstance(row[0],str) or not re.fullmatch(r'[A-Z]{1,3}-\d+',row[0].strip()):
            continue
        code = row[0].strip()
        if not row[10] or not row[4] or code in seen:
            issues.append({'row':rownum,'code':code,'reason':'Linha incompleta ou código repetido; não importada.'})
            continue
        seen.add(code)
        answers = {}
        for k,value in zip(KEYS,row[:49]):
            if value is None: continue
            answers[k] = value.date().isoformat() if isinstance(value,datetime.datetime) else value
        records.append({'id':f'hist-{source_id}-{code}', 'schemaVersion':1,'questionnaireVersion':source_id,
            'kind':'trimestral','period':period,'state':'importado','pointId':code,'answers':answers,
            'observedStatus':'nao-avaliado','notes':'','photos':[], 'sourceId':source_id,
            'source':{'file':path.name,'sheet':s.title,'row':rownum,'sha256':sha},'revision':0})
    sources.append({'id':source_id,'label': period.replace('-T',' · trimestre ')+(' · revisão 19/10' if i==5 else ''),
        'file':path.name,'period':period,'count':len(records),'issues':issues})
    all_records.extend(records)
    for c,(key,label) in enumerate(zip(KEYS,LABELS)):
        if i==0:
            fields.append({'key':key,'label':label,'column':openpyxl.utils.get_column_letter(c+1),
                           'type':'date' if c==4 else 'number' if c in [9,12,13] else 'select' if OPTION_COL[c] is not None else 'text',
                           'step':0 if c in [0,1,2,3,4,10,11,12,13,14] else 1 if c in [5,6,7,8,9] else 2 if c<25 else 3 if c<34 else 4,
                           'quarterly':c in [5,6,7,8,9], 'versions':{}})
        fields[c]['versions'][source_id] = {'instruction':raw[1][c], 'options':options[OPTION_COL[c]] if OPTION_COL[c] is not None else []}
    book.close()
(OUT/'fields.json').write_text(json.dumps(fields,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'historical.json').write_text(json.dumps({'sources':sources,'records':all_records},ensure_ascii=False,separators=(',',':')),encoding='utf8')
print(f'{len(sources)} sources, {len(all_records)} records, {len(fields)} fields. Excluded issues: {sum(len(s["issues"]) for s in sources)}')
