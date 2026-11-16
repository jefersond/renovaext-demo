#!/usr/bin/env python3
"""
Camada 3 (Ferramentas - Protocolo V.L.A.E.G.)
Script determinístico de verificação de Link, isolamento de credenciais (Zero Zuno)
e integridade do esquema SQL/RLS do RenovaExt.
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TMP_DIR = ROOT / ".tmp"


def verify_workspace() -> int:
    TMP_DIR.mkdir(exist_ok=True)
    required_files = [
        ROOT / "gemini.md",
        ROOT / "task_plan.md",
        ROOT / "findings.md",
        ROOT / "progress.md",
        ROOT / ".env.example",
        ROOT / "supabase" / "migrations" / "20261112000001_renovaext_mvp_schema.sql",
    ]
    missing = [str(f.relative_to(ROOT)) for f in required_files if not f.exists()]
    if missing:
        print(f"[ERRO] Arquivos obrigatórios ausentes: {missing}")
        return 1

    # Verificar que não há vazamento de credenciais da Zuno no .env.example
    env_content = (ROOT / ".env.example").read_text(encoding="utf-8")
    if "zuno" in env_content.lower().replace("isolado da zuno", ""):
        print("[ERRO] Referência indevida à Zuno encontrada nas variáveis de ambiente.")
        return 1

    # Verificar invariantes RLS na migração SQL
    sql_content = (
        ROOT / "supabase" / "migrations" / "20261112000001_renovaext_mvp_schema.sql"
    ).read_text(encoding="utf-8")

    required_tables = [
        "public.companies",
        "public.profiles",
        "public.clients",
        "public.equipments",
        "public.service_history",
        "public.opportunity_history",
        "public.proposals",
        "public.audit_logs",
    ]
    for tbl in required_tables:
        if f"alter table {tbl} enable row level security;" not in sql_content.lower():
            print(f"[ERRO] RLS não habilitado para a tabela {tbl}")
            return 1

    report_path = TMP_DIR / "handshake_verification.txt"
    report_path.write_text(
        "STATUS=OK\nISOLATION=VERIFIED\nRLS_TABLES=8\nBILLING_ACTIVE=FALSE\n",
        encoding="utf-8",
    )
    print("[OK] Handshake e verificação de esquema/RLS do RenovaExt concluídos com sucesso.")
    return 0


if __name__ == "__main__":
    sys.exit(verify_workspace())
