# -*- coding: utf-8 -*-
"""Regenera data/features-PV.json a partir de data/Pontos Viciados - Revitalizações.xlsb.

Executar: npm run import:pontos-viciados
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timedelta
from pathlib import Path

from pyxlsb import open_workbook

ROOT = Path(__file__).resolve().parents[1]
XLSB = ROOT / "data" / "Pontos Viciados - Revitalizações.xlsb"
OUT = ROOT / "data" / "features-PV.json"
CODIGO_RE = re.compile(r"^[A-Z]{2,3}-\d+$", re.I)


def cell_str(v) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()


def excel_date(v) -> str | None:
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        dt = datetime(1899, 12, 30) + timedelta(days=float(v))
        return dt.strftime("%Y-%m-%d")
    s = cell_str(v)
    if re.match(r"^\d{4}-\d{2}-\d{2}", s):
        return s[:10]
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", s)
    if m:
        d, mo, y = m.groups()
        return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"
    return None


def norm_volumetria(raw: str) -> str:
    t = raw.strip().lower()
    if not t:
        return ""
    if "inativ" in t or "não se aplica" in t or "nao se aplica" in t:
        return "Não se aplica (inativo)."
    if "mais de 5" in t:
        return "Mais de 5m³"
    if "menos de 1" in t:
        return "Menos de 1m³"
    if "entre 1" in t:
        return "Entre 1m³ e 5m³"
    return raw.strip()


def norm_frequencia(raw: str) -> str:
    t = raw.strip()
    if not t:
        return ""
    return t[:1].upper() + t[1:]


def main() -> None:
    if not XLSB.exists():
        raise SystemExit(f"Excel não encontrado: {XLSB}")

    features = []
    idx = 0
    with open_workbook(str(XLSB)) as wb:
        with wb.get_sheet(1) as sheet:
            for i, row in enumerate(sheet.rows()):
                if i < 6:
                    continue
                vals = [c.v for c in row]
                if len(vals) < 8:
                    continue
                codigo = cell_str(vals[1]).upper()
                if not CODIGO_RE.match(codigo):
                    continue
                address = cell_str(vals[2])
                sub = cell_str(vals[4])
                volumetria = norm_volumetria(cell_str(vals[5]))
                lat = vals[6]
                lng = vals[7]
                if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
                    print(f"Ignorado {codigo}: lat/lng inválidos")
                    continue
                limpezas_raw = vals[8] if len(vals) > 8 else None
                limpezas = (
                    int(limpezas_raw)
                    if isinstance(limpezas_raw, (int, float))
                    else None
                )
                frequencia = norm_frequencia(cell_str(vals[9]) if len(vals) > 9 else "")
                ultima = excel_date(vals[11] if len(vals) > 11 else None)
                inactive = "inativ" in frequencia.lower() or "inativ" in volumetria.lower()
                lat_r = round(float(lat), 6)
                lng_r = round(float(lng), 6)
                item = {
                    "id": f"PV:{idx}",
                    "service": "PV",
                    "setor": codigo,
                    "name": codigo,
                    "coords": [[lat_r, lng_r]],
                    "centroid": [lat_r, lng_r],
                    "fillColor": "#adff2f",
                    "geometry": "point",
                    "serviceDisplay": "Pontos Viciados",
                    "subprefeitura": sub,
                    "logradouro": address,
                    "service_type": "Pontos Viciados",
                    "service_icon": "warning",
                    "volumetria": volumetria,
                    "address": address,
                    "ultimaRevitalizacao": ultima,
                }
                if inactive:
                    item["status"] = "Inativo"
                if limpezas is not None:
                    item["limpezas"] = limpezas
                if frequencia:
                    item["frequencia"] = frequencia
                features.append(item)
                idx += 1

    OUT.write_text(
        json.dumps({"service": "PV", "features": features}, ensure_ascii=False, indent=2)
        + "\n",
        encoding="utf-8",
    )
    print(f"OK: {len(features)} pontos em {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
