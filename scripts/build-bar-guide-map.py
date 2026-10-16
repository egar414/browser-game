import json,html,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=json.loads((root/'src/data/mooloolaba.json').read_text())
route=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {BAR_ROUTE} from './src/systems/bar-guide.js';console.log(JSON.stringify(BAR_ROUTE));"],cwd=root))
svg=['''<svg xmlns="http://www.w3.org/2000/svg" viewBox="-470 -1990 2080 1430" role="img" aria-label="Route from The Wharf Mooloolaba to the estimated bar wave zone"><title>Estuary Rats — finding the bar</title><desc>Original game guide using OpenStreetMap shoreline. The orange route follows the river around the headland. Sandbanks are estimated game placements, not surveyed depths.</desc><defs><clipPath id="coast"><rect x="-450" y="-1885" width="2020" height="1230" rx="25"/></clipPath></defs><rect x="-470" y="-1990" width="2080" height="1430" fill="#123a41"/><text x="-420" y="-1915" fill="#f5edcf" font-family="Arial" font-size="49" font-weight="bold">ESTUARY RATS · FIND THE BAR</text><text x="1490" y="-1920" fill="#f5edcf" font-family="Arial" font-size="32" text-anchor="end">N ↑</text><g clip-path="url(#coast)"><rect x="-450" y="-1885" width="2020" height="1230" fill="#286b78"/>''']
for land in p['land']:
 rings=[land['points'],*land.get('holes',[])]
 d=' '.join('M'+' L'.join(f'{x},{z}'for x,z in r)+' Z' for r in rings)
 svg.append(f'<path d="{d}" fill="{("#cec6a4" if land.get("sand") else "#a6b59a")}" fill-rule="evenodd" stroke="#728d7b" stroke-width="2"/>')
for wall in p.get('breakwaters',[]):svg.append('<polyline points="'+' '.join(f'{x},{z}'for x,z in wall['points'])+'" fill="none" stroke="#445b60" stroke-width="9"/>')
for x,z,rx,rz in [(1110,-1740,110,42),(1270,-1745,105,39),(1395,-1725,75,33)]:svg.append(f'<ellipse cx="{x}" cy="{z}" rx="{rx}" ry="{rz}" fill="#f0c66a88" stroke="#f8d896" stroke-width="4"/>')
svg.append('<polyline points="'+' '.join(f'{x},{z}'for x,z in route)+'" fill="none" stroke="#14373d" stroke-width="18" stroke-linejoin="round"/>')
svg.append('<polyline points="'+' '.join(f'{x},{z}'for x,z in route)+'" fill="none" stroke="#ffb05e" stroke-width="10" stroke-linejoin="round"/>')
for i in [3,7,11,17,19]:
 x,z=route[i];svg.append(f'<circle cx="{x}" cy="{z}" r="12" fill="#fff0d2"/>')
svg.append('<circle cx="-220" cy="-1080" r="22" fill="#eff6e6" stroke="#23454e" stroke-width="7"/><circle cx="1270" cy="-1745" r="23" fill="#ffb05e" stroke="#123a41" stroke-width="6"/>')
svg.append('</g>')
for x,z,w,text in [(-410,-1190,450,'START · THE WHARF'),(810,-1870,700,'BAR WAVES · GAME SANDBANKS'),(450,-1470,405,'RIVER MOUTH'),(1050,-1530,490,'POINT CARTWRIGHT')]:
 svg.append(f'<rect x="{x-14}" y="{z-39}" width="{w}" height="62" rx="9" fill="#123a41ee"/><text x="{x}" y="{z+4}" fill="#fff0d2" font-family="Arial" font-size="30" font-weight="bold">{html.escape(text)}</text>')
svg.append('''<text x="-410" y="-610" fill="#f5edcf" font-family="Arial" font-size="28">Press N / tap BAR WAVES in the game for turn guidance. Calm seas switch to Rolling swell.</text><text x="-410" y="-570" fill="#bad1c5" font-family="Arial" font-size="24">Map © OpenStreetMap contributors · ODbL. Sandbanks and wave markers are approximate game features. Not for navigation.</text></svg>''')
(root/'public/bar-route.svg').write_text('\n'.join(svg));print('Wrote original OSM route guide:',(root/'public/bar-route.svg').stat().st_size,'bytes')
