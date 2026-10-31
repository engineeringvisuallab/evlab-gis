"""Browser smoke test (Playwright, Chromium). Default: Leaflet/proj4/Turf are replaced by a do-nothing stub, so this checks module loading,
DOM wiring, import/table/styling/save/open/export flows and console errors, NOT real map rendering. Run with --real (needs internet) to use the real libraries.
Usage: pip install playwright && playwright install chromium && python3 tests/browser-smoke.py [--real]"""
import json, os, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); REAL = '--real' in sys.argv; PORT = 8765
STUB = "(()=>{const mk=()=>new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>0:k==='then'?undefined:mk(),apply:()=>mk(),construct:()=>mk()});window.L=mk();window.proj4=mk();})();"
tmp = tempfile.mkdtemp(); W = lambda n, s: (open(os.path.join(tmp, n), 'w').write(s), os.path.join(tmp, n))[1]
csv = W('pipes.csv', 'id,lat,lng,dia,mat\n007,23.80,90.40,100,DI\n008,23.81,90.41,150,PVC\n009,23.82,90.42,200,DI\n010,95,90,1,bad\n')
gj = W('zones.geojson', json.dumps({"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"z": "A", "v": 1}, "geometry": {"type": "Polygon", "coordinates": [[[90, 23], [91, 23], [91, 24], [90, 23]]]}}]}))
kml = W('p.kml', '<kml><Document><Placemark><name>K1</name><Point><coordinates>90.1,23.1</coordinates></Point></Placemark></Document></kml>')
gpx = W('t.gpx', '<gpx><wpt lat="23.5" lon="90.5"><name>W</name></wpt></gpx>')
asc = W('d.asc', 'ncols 4\nnrows 4\nxllcorner 90\nyllcorner 23\ncellsize 0.01\nNODATA_value -9999\n' + '\n'.join(' '.join(str(10 * r + c) for c in range(4)) for r in range(4)) + '\n')
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
errs, fails = [], []
def check(name, cond, info=''):
    print(('ok   ' if cond else 'FAIL ') + name + (f'  [{info}]' if (info and not cond) else '')); cond or fails.append(name)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(accept_downloads=True); page = ctx.new_page()
        page.on('pageerror', lambda e: errs.append('pageerror: ' + str(e))); page.on('console', lambda m: m.type == 'error' and errs.append('console: ' + m.text))
        if not REAL:
            ctx.route('**/unpkg.com/**', lambda r: r.fulfill(status=200, content_type='text/css' if r.request.url.endswith('.css') else 'application/javascript', body='' if r.request.url.endswith('.css') else STUB))
        saved = {}
        def dlg(d): d.accept('Smoke project' if 'Project name' in d.message else 'Network' if 'Group name' in d.message else 'Assets' if d.message == 'Layer name' else 'point' if 'Geometry type' in d.message else 'asset_id, dia:number' if d.message.startswith('Fields') else (d.default_value or '')) if d.type == 'prompt' else d.accept()
        page.on('dialog', dlg)
        page.goto(f'http://localhost:{PORT}/index.html'); page.wait_for_timeout(500)
        txt = lambda sel: page.inner_text(sel)
        check('page loads, title', page.title() == 'EVLab GIS')
        page.set_input_files('#file-input', csv); page.wait_for_selector('#layer-tree li')
        check('CSV imported with skipped row reported', 'Imported 3 features' in txt('#s-msg') and '1 skipped' in txt('#s-msg'), txt('#s-msg'))
        check('attribute table rows', page.locator('#table-panel tbody tr, #table-panel tr').count() >= 4)
        page.locator('#table-panel tr').nth(1).click(); check('row click selects', 'Selected: 1' in txt('#s-sel'), txt('#s-sel'))
        page.select_option('#m', 'categorized'); page.select_option('#f', 'mat'); check('categorized legend (2 materials)', page.locator('#lg div').count() == 2, str(page.locator('#lg div').count()))
        page.select_option('#m', 'graduated'); check('graduated legend', page.locator('#lg div').count() == 4)
        page.select_option('#gm', 'quantile'); check('quantile legend', page.locator('#lg div').count() == 4, str(page.locator('#lg div').count())); page.select_option('#gm', 'jenks'); check('jenks legend (3 distinct values)', page.locator('#lg div').count() == 3, str(page.locator('#lg div').count()))
        page.click('#btn-val'); check('validate reports', 'invalid' in txt('#s-msg'), txt('#s-msg'))
        page.locator('#lab select').nth(1).select_option('dia'); page.locator('#lab select').nth(2).select_option('>'); page.locator('#lab input:not([type])').fill('100'); page.locator('#lab input:not([type])').press('Tab')
        page.get_by_role('button', name='Add condition').click(); check('filter dia > 100', 'Filter shows 2 of 3' in txt('#s-msg'), txt('#s-msg'))
        page.locator('#lab select').nth(1).select_option('mat'); page.locator('#lab select').nth(2).select_option('='); page.locator('#lab input:not([type])').fill('DI'); page.locator('#lab input:not([type])').press('Tab')
        page.get_by_role('button', name='Add condition').click(); check('filter AND second condition', 'Filter shows 1 of 3' in txt('#s-msg'), txt('#s-msg'))
        page.set_input_files('#file-input', gj); page.wait_for_function('document.querySelectorAll("#layer-tree li").length==2')
        page.set_input_files('#file-input', kml); page.wait_for_function('document.querySelectorAll("#layer-tree li").length==3')
        page.set_input_files('#file-input', gpx); page.wait_for_function('document.querySelectorAll("#layer-tree li").length==4')
        check('GeoJSON, KML, GPX imported', 'Imported 1 features' in txt('#s-msg'), txt('#s-msg'))
        page.set_input_files('#file-input', asc); page.wait_for_selector('#rast select'); check('ASC raster listed', 'Raster loaded' in txt('#s-msg') or 'cells' in txt('#rast'), txt('#s-msg'))
        page.locator('#layer-tree li button[title="Duplicate layer"]').first.click(); page.wait_for_function('document.querySelectorAll("#layer-tree li").length==5'); check('duplicate layer', True)
        with page.expect_download() as d: page.select_option('#exp', 'geojson')
        check('GeoJSON export download', d.value.suggested_filename.endswith('.geojson'), d.value.suggested_filename)
        with page.expect_download() as d: page.select_option('#exp', 'kml')
        check('KML export download', d.value.suggested_filename.endswith('.kml'))
        with page.expect_download() as d: page.click('#btn-save')
        path = os.path.join(tmp, 'proj.evlab.json'); d.value.save_as(path); pj = json.load(open(path))
        check('project file structure', pj['format'] == 'evlab-gis-project' and len(pj['layers']) == 5 and pj['name'] == 'Smoke project' and len(pj['rasters']) == 1, str(pj.get('name')))
        page.click('#btn-new'); page.wait_for_function('document.querySelectorAll("#layer-tree li").length==0')
        page.set_input_files('#proj-input', path); page.wait_for_function('document.querySelectorAll("#layer-tree li").length==5')
        check('project reopened with raster warning', 'warnings' in txt('#s-msg'), txt('#s-msg'))
        page.locator('#layer-tree li button[title="Group"]').first.click(); check('group header created', page.locator('#layer-tree li.group').count() == 1)
        page.click('#btn-id'); page.click('#btn-id'); page.click('#btn-dist'); page.keyboard.press('Escape'); page.click('#btn-ana')
        page.locator('#ana select').first.select_option('attr'); page.wait_for_timeout(100)
        check('analysis panel re-renders', page.locator('#ana select').count() >= 2)
        page.select_option('#pc', 'EPSG:32646'); check('project CRS switch', '32646' in txt('#s-crs'))
        rows = lambda: page.locator('#table-panel tr').count()
        page.get_by_role('button', name='New layer').click(); page.wait_for_function('[...document.querySelectorAll("#layer-tree .name")].some(n => n.textContent.startsWith("Assets"))')
        check('new layer created, editing on', 'created' in txt('#s-msg') and 'asset_id' in txt('#table-panel'), txt('#s-msg'))
        page.evaluate("""async () => { const LM = await import('/js/core/layer-manager.js'), E = await import('/js/edit/edit-ops.js'), H = await import('/js/edit/history.js'); const l = LM.getActive();
          [[90.4, 23.8], [90.5, 23.9]].forEach(p => H.run(E.addFeatureCmd(l.id, E.newFeature(l, E.buildGeometry('Point', [p]))))); }""")
        check('two features added', rows() == 3, str(rows()))
        page.locator('#table-panel tr').nth(1).click(); page.get_by_role('button', name='Delete selected').click(); check('delete selected', rows() == 2, str(rows()))
        page.get_by_role('button', name='Undo', exact=True).click(); check('undo restores', rows() == 3, str(rows()))
        page.locator('body').click(position={'x': 5, 'y': 5}); page.keyboard.press('Control+z'); check('Ctrl+Z undoes last add', rows() == 2, str(rows()))
        page.get_by_role('button', name='Snap: on').click(); check('snap toggles off', page.get_by_role('button', name='Snap: off').count() == 1 and 'Snapping off' in txt('#s-msg'), txt('#s-msg')); page.get_by_role('button', name='Snap: off').click()
        page.get_by_role('button', name='Stop editing').click(); check('editing stops', page.get_by_role('button', name='Add feature').is_disabled())
        vis = lambda sel: page.locator(sel).is_visible()
        page.click('#tg-left'); check('hide layers panel', not vis('#left') and vis('#right')); page.click('#tg-left'); check('show layers panel', vis('#left'))
        page.click('#tg-table'); check('hide table', not vis('#table-panel')); page.click('#tg-table')
        page.click('#tg-full'); check('map only hides all panels', not vis('#left') and not vis('#right') and not vis('#table-panel') and vis('#map')); page.click('#tg-full'); check('map only restores', vis('#left') and vis('#right') and vis('#table-panel'))
        page.locator('#right h3').first.click(); check('section collapses', not vis('#sym')); page.locator('#right h3').first.click(); check('section expands', vis('#sym'))
        page.click('#tg-right'); page.reload(); page.wait_for_timeout(400); check('panel state survives reload', not vis('#right') and vis('#left')); page.click('#tg-right')
        page.wait_for_timeout(300); b.close()
finally:
    srv.terminate()
print('\nconsole/page errors:', len(errs)); [print('  ', e) for e in errs[:15]]
print('FAILED: ' + ', '.join(fails) if fails else 'all steps ok'); sys.exit(1 if fails or errs else 0)
