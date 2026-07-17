"""Auditoria UI — ATLAS Wealth Verification — 2026-07-16"""
import sys, os, json, time
from playwright.sync_api import sync_playwright

URL = "http://localhost:7821"
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
TIMESTAMP = time.strftime("%Y%m%d-%H%M%S")

results = {
    "target": URL,
    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
    "pageerrors": [],
    "console": [],
    "interactions": [],
    "screenshots": [],
}

def log_console(msg):
    entry = {"type": msg.type, "text": msg.text}
    results["console"].append(entry)
    if msg.type == "error":
        results["pageerrors"].append(msg.text)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    page = context.new_page()
    page.on("console", log_console)

    # --- 1. Carga inicial ---
    print("[1/7] Carregando pagina inicial...")
    page.goto(URL, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(2000)  # Babel compile time
    title = page.title()
    print(f"  Title: {title}")
    results["title"] = title

    # Screenshot desktop
    ss_desktop = os.path.join(OUT_DIR, f"audit-ui-desktop-{TIMESTAMP}.png")
    page.screenshot(path=ss_desktop, full_page=True)
    results["screenshots"].append(ss_desktop)
    print(f"  Screenshot: {ss_desktop}")

    # --- 2. Verificar navegacao por hash ---
    print("[2/7] Testando navegacao por hash...")
    ROUTES = ["#/dashboard", "#/carteira/A1", "#/achados", "#/comparativo",
              "#/receitas", "#/cadastro", "#/busca", "#/risco",
              "#/tendencia", "#/importar", "#/usuarios"]
    nav_ok = 0
    for route in ROUTES:
        try:
            page.goto(f"{URL}{route}", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(500)
            # Check if the page rendered something meaningful
            body_text = page.locator("body").inner_text()
            has_content = len(body_text.strip()) > 20
            has_error = page.locator("text=Erro").count() > 0 or page.locator("text=ERRO").count() > 0
            status = "OK" if has_content and not has_error else ("ERRO" if has_error else "VAZIO")
            if status == "OK":
                nav_ok += 1
            results["interactions"].append({"action": "navigate", "route": route, "status": status})
            if status != "OK":
                print(f"  {route} -> {status} (len={len(body_text.strip())})")
        except Exception as e:
            results["interactions"].append({"action": "navigate", "route": route, "status": f"EXCEPTION: {e}"})
            print(f"  {route} -> EXCEPTION: {e}")
    print(f"  Navegacao: {nav_ok}/{len(ROUTES)} rotas OK")

    # --- 3. Interacoes no dashboard ---
    print("[3/7] Testando interacoes no dashboard...")
    page.goto(f"{URL}#/dashboard", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(1000)

    # Testar chips/filtros se existirem
    chips = page.locator(".chip, [class*='chip'], [class*='filter'], button").all()
    print(f"  Elementos interativos encontrados: {len(chips)}")
    # NOTA: 'clicked' conta cliques que nao lancaram excecao. NAO prova que o
    # elemento fez algo (mudanca de rota, filtro, estado ou conteudo). Um botao
    # inerte incrementa este contador. Prova de funcionamento vive em
    # tests/caracterizacao/, que compara numeros antes/depois. Aqui so registramos
    # a excecao quando ocorre, em vez de engoli-la.
    clickable_count = 0
    click_errors = []
    for i, chip in enumerate(chips[:10]):  # max 10 for safety
        try:
            text = chip.inner_text().strip()[:30]
            if text and chip.is_visible():
                chip.click()
                page.wait_for_timeout(300)
                clickable_count += 1
        except Exception as e:
            click_errors.append({"index": i, "error": str(e)[:120]})
    results["interactions"].append({
        "action": "click_chips_sem_erro",
        "found": len(chips),
        "clicked_sem_erro": clickable_count,
        "errors": click_errors,
    })

    # --- 4. Testar ordenacao de tabela ---
    print("[4/7] Testando ordenacao de tabela...")
    page.goto(f"{URL}#/carteira/A1", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(1000)

    th_elements = page.locator("th, [data-col], [class*='sort']").all()
    sortable = 0
    sort_errors = []
    for th in th_elements[:5]:
        try:
            if th.is_visible():
                th.click()
                page.wait_for_timeout(500)
                sortable += 1
        except Exception as e:
            sort_errors.append(str(e)[:120])
    # 'clicked_sem_erro' aqui tampouco prova ordenacao — so que o clique nao
    # estourou. Verificar ordem real e trabalho de tests/caracterizacao/.
    results["interactions"].append({
        "action": "sort_headers_sem_erro",
        "found": len(th_elements),
        "clicked_sem_erro": sortable,
        "errors": sort_errors,
    })

    # --- 5. Mobile viewport ---
    print("[5/7] Testando viewport mobile (390px)...")
    mobile_page = context.new_page()
    mobile_page.on("console", log_console)
    mobile_page.set_viewport_size({"width": 390, "height": 844})
    mobile_page.goto(URL, wait_until="networkidle", timeout=30000)
    mobile_page.wait_for_timeout(2000)

    ss_mobile = os.path.join(OUT_DIR, f"audit-ui-mobile-{TIMESTAMP}.png")
    mobile_page.screenshot(path=ss_mobile, full_page=True)
    results["screenshots"].append(ss_mobile)
    print(f"  Screenshot: {ss_mobile}")

    # Check mobile layout
    overflow_x = mobile_page.evaluate("() => document.body.scrollWidth > window.innerWidth")
    if overflow_x:
        results["pageerrors"].append("Mobile: overflow horizontal detectado (scrollWidth > innerWidth)")
        print("  AVISO: overflow horizontal no mobile")

    mobile_page.close()

    # --- 6. Testar importacao (upload de CSV) ---
    print("[6/7] Testando tela de importacao...")
    page.goto(f"{URL}#/importar", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(1000)

    file_input = page.locator("input[type='file']")
    if file_input.count() > 0:
        results["interactions"].append({"action": "import_ui", "status": "file_input_present"})
        print("  Input de arquivo presente")
    else:
        results["interactions"].append({"action": "import_ui", "status": "no_file_input"})
        print("  AVISO: input[type=file] nao encontrado")

    # --- 7. Resumo ---
    print("[7/7] Gerando resumo...")

    # Contar pageerrors distintos
    unique_errors = list(set(results["pageerrors"]))
    print(f"\n{'='*60}")
    print(f"RESUMO:")
    print(f"  Title: {results['title']}")
    print(f"  Page errors: {len(unique_errors)}")
    for err in unique_errors:
        print(f"    - {err[:120]}")
    print(f"  Console (total): {len(results['console'])} entries")
    print(f"  Rotas OK: {nav_ok}/{len(ROUTES)}")
    print(f"  Screenshots: {len(results['screenshots'])}")

    browser.close()

# Salvar raw JSON
raw_path = os.path.join(OUT_DIR, f"audit-raw-{TIMESTAMP}.json")
with open(raw_path, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f"\nRaw JSON: {raw_path}")
print("Concluido.")
