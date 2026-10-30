import assert from 'node:assert/strict';
import { parseXML, findAll } from '../js/data/xml.js';
import { parseKML } from '../js/data/kml-import.js';
import { parseGPX } from '../js/data/gpx-import.js';
import { validateXYZ } from '../js/map/basemap-manager.js';
import { toKML } from '../js/io/kml-export.js';
const x = parseXML('<?xml version="1.0"?><!-- c --><a x="1&amp;2"><b>t &lt; <![CDATA[<raw>]]></b><c/></a>'); assert.equal(x.children[0].attrs.x, '1&2'); assert.equal(findAll(x, 'b')[0].text, 't < <raw>'); assert.equal(findAll(x, 'c').length, 1);
assert.throws(() => parseXML('<a><b></a>')); assert.throws(() => parseXML('<a>')); assert.throws(() => parseXML('<!DOCTYPE a [<!ENTITY e "x">]><a>&e;</a>'));
const kml = `<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="x"><Document><Folder>
<Placemark><name>P &amp; Q</name><ExtendedData><Data name="id"><value>007</value></Data><Data name="dia"><value>150</value></Data></ExtendedData><Point><coordinates>89.5, 22.8, 4</coordinates></Point></Placemark>
<Placemark><name>L</name><ExtendedData><Data name="dia"><value>200</value></Data></ExtendedData><LineString><coordinates>90,23 90.1,23.1</coordinates></LineString></Placemark>
<Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>0,0 4,0 4,4 0,0</coordinates></LinearRing></outerBoundaryIs><innerBoundaryIs><LinearRing><coordinates>1,1 2,1 2,2 1,1</coordinates></LinearRing></innerBoundaryIs></Polygon></Placemark>
<Placemark><MultiGeometry><Point><coordinates>1,1</coordinates></Point><Point><coordinates>2,2</coordinates></Point></MultiGeometry></Placemark>
<Placemark><Point><coordinates>500000,2000000</coordinates></Point></Placemark>
<Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>0,0 1,0 1,1 0,1</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
<Placemark><name>nogeom</name></Placemark><NetworkLink/></Folder></Document></kml>`;
const k = parseKML(kml), F = k.geojson.features; assert(k.ok && F.length === 4 && k.skipped === 4);
assert.deepEqual(F[0].geometry.coordinates, [89.5, 22.8, 4]); assert.deepEqual(F[0].properties, { name: 'P & Q', id: '007', dia: 150 }); assert.equal(F[1].properties.dia, 200);
assert.equal(F[2].geometry.coordinates.length, 2); assert.equal(F[3].geometry.type, 'MultiPoint'); assert(k.errors.some(e => /outside lon\/lat/.test(e)) && k.errors.some(e => /not closed/.test(e)) && k.errors.some(e => /NetworkLink/.test(e)));
assert(!parseKML('<kml><Document/></kml>').ok && !parseKML('<kml>').ok);
const back = parseKML(toKML('rt', [{ properties: { name: 'A<1>', dia: 150, id: '007' }, geometry: { type: 'Point', coordinates: [89.5, 22.8] } }])); assert(back.ok); assert.deepEqual(back.geojson.features[0].properties, { name: 'A<1>', dia: 150, id: '007' }); // own KML export round trip
const gpx = `<gpx version="1.1"><wpt lat="23.5" lon="90.5"><ele>12.5</ele><name>W1</name></wpt><wpt lat="99" lon="90"/>
<trk><name>T</name><trkseg><trkpt lat="23" lon="90"><ele>5</ele></trkpt><trkpt lat="23.1" lon="90.1"/></trkseg><trkseg><trkpt lat="24" lon="91"/><trkpt lat="24.1" lon="91.1"/></trkseg></trk>
<trk><trkseg><trkpt lat="1" lon="1"/></trkseg></trk><rte><name>R</name><rtept lat="1" lon="1"/><rtept lat="2" lon="2"/></rte></gpx>`;
const g = parseGPX(gpx), GF = g.geojson.features; assert(g.ok && GF.length === 3 && g.skipped === 2);
assert.deepEqual(GF[0].geometry.coordinates, [90.5, 23.5, 12.5]); assert.equal(GF[0].properties.ele, 12.5); assert.equal(GF[1].geometry.type, 'MultiLineString'); assert.equal(GF[2].properties.gpx_type, 'route');
assert(!parseGPX('<kml/>').ok && !parseGPX('<gpx/>').ok);
assert.deepEqual(validateXYZ('https://t.example/{z}/{x}/{y}.png', 'Example'), []); assert(validateXYZ('http://t/{z}/{x}/{y}', 'a').length === 1);
assert(validateXYZ('https://t/{z}/{x}', 'a').some(e => /\{y\}/.test(e))); assert(validateXYZ('https://t/{z}/{z}/{x}/{y}', 'a').some(e => /\{z\}/.test(e))); assert(validateXYZ('https://t/{z}/{x}/{y}', ' ').length === 1);
console.log('m8: all tests passed');
