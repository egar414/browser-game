"""Generate a distributable whole-estuary map from the checked-in ODbL data."""
import json,html
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=json.loads((root/'src/data/mooloolaba.json').read_text());w=p['world'];pad=130
x,z=w['minX']-pad,w['minZ']-pad
width=w['maxX']-w['minX']+pad*2;height=w['maxZ']-w['minZ']+pad*2+180
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {z-180} {width} {height}" role="img" aria-label="Mooloolah estuary, canals and upstream game map"><title>Estuary Rats — whole estuary map</title>',f'<rect x="{x}" y="{z-180}" width="{width}" height="{height}" fill="#174f60"/>',f'<text x="{x+60}" y="{z-80}" fill="#f5ebcf" font-family="Arial" font-size="80" font-weight="bold">ESTUARY RATS · CANALS, RIVER &amp; COAST</text>']
for land in p['land']:
 d=' '.join('M'+' L'.join(f'{a},{b}'for a,b in ring)+' Z'for ring in [land['points'],*land.get('holes',[])])
 svg.append(f'<path d="{d}" fill="#a8b597" stroke="#d3c8a4" stroke-width="4" fill-rule="evenodd"/>')
for r in p['roads']:
 points=' '.join(f'{a},{b}'for a,b in r['points']);svg.append(f'<polyline points="{points}" stroke="#7e8e82" stroke-width="{r["w"]}" fill="none"/>')
for b in p['buildings']:
 points=' '.join(f'{a},{c}'for a,c in b['points']);svg.append(f'<polygon points="{points}" fill="#efe1bf" stroke="#5e7871" stroke-width=".8"/>')
for pool in p.get('pools',[]):
 points=' '.join(f'{a},{b}'for a,b in pool['points']);svg.append(f'<polygon points="{points}" fill="#56d2ce"/>')
for b in p['bridges']:
 points=' '.join(f'{a},{c}'for a,c in b['points']);svg.append(f'<polyline points="{points}" stroke="#e6bc74" stroke-width="{b["w"]+5}" fill="none"><title>{html.escape(b["name"])}</title></polyline>')
for place in p.get('coastalExtension',{}).get('destinations',[]):
 a,b=place['x'],place['z'];svg.append(f'<circle cx="{a}" cy="{b}" r="17" fill="#ffb55d"/><text x="{a+30}" y="{b-25}" font-family="Arial" font-size="38" font-weight="bold" fill="#113c43" stroke="#dde2c6" stroke-width="7" paint-order="stroke">{html.escape(place["name"].upper())}</text>')
route=p.get('coastalExtension',{}).get('route',[])
if route:svg.append('<polyline points="'+' '.join(f'{a},{b}'for a,b in route)+'" fill="none" stroke="#eab76b" stroke-width="7" stroke-dasharray="18 14"><title>Game coastal cruising route</title></polyline>')
for name,a,b in [('THE WHARF',p['spawn']['x'],p['spawn']['z']),('UPSTREAM · WYUNA CANAL',112.9,2502.7),('MINYAMA CANALS',120,-200),('MOUNTAIN CREEK',-1900,300),('BAR WAVE ZONE',600,-1630),('POINT CARTWRIGHT',1380,-1520)]:
 svg.append(f'<circle cx="{a}" cy="{b}" r="17" fill="#ffb55d" stroke="#163d43" stroke-width="5"/><text x="{a+25}" y="{b-25}" font-family="Arial" font-size="35" font-weight="bold" fill="#113c43" stroke="#dde2c6" stroke-width="7" paint-order="stroke">{html.escape(name)}</text>')
svg.append(f'<path d="M {w["maxX"]-100},{w["minZ"]+220} l 0,-140 m -25,35 l 25,-35 25,35" fill="none" stroke="#f5ebcf" stroke-width="7"/><text x="{w["maxX"]-115}" y="{w["minZ"]+60}" fill="#f5ebcf" font-family="Arial" font-size="45">N</text>')
svg.append(f'<path d="M {x+80},{w["maxZ"]+40} h 500" stroke="#f5ebcf" stroke-width="10"/><text x="{x+80}" y="{w["maxZ"]-10}" fill="#153d42" font-family="Arial" font-size="32">500 metres</text>')
svg.append(f'<text x="{x+80}" y="{w["maxZ"]+100}" fill="#d9e6d4" font-family="Arial" font-size="28">Map © OpenStreetMap contributors · ODbL 1.0. Game scenery and clearances are approximate. Not for navigation.</text></svg>')
(root/'public/estuary-map.svg').write_text('\n'.join(svg));print('Wrote public/estuary-map.svg')
