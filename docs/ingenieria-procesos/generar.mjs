import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { models, revision, reviewedAt } from './modelos.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const xml = value => String(value).replace(/[<>&"']/g, char => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&apos;' })[char]);
const digest = content => createHash('sha256').update(content).digest('hex');
const nodeTypes = new Set(['startEvent','endEvent','userTask','serviceTask','exclusiveGateway']);
const diagramDirectory = path.join(directory, 'bpmn');
fs.mkdirSync(diagramDirectory, { recursive: true });

function build(model) {
  const prefix = model.id + '_';
  const id = value => prefix + value;
  const nodes = model.nodes.map(node => {
    const small = node.type.endsWith('Event');
    const gateway = node.type === 'exclusiveGateway';
    const w = small ? 36 : gateway ? 52 : 144;
    const h = small ? 36 : gateway ? 52 : 80;
    const offset = node.offset === 165 ? 110 : node.offset === -55 ? -20 : node.offset;
    return { ...node, x: 120 + node.col * 195 + (144 - w) / 2, y: 140 + node.lane * 280 + offset + (80 - h) / 2, w, h };
  });
  const map = new Map(nodes.map(node => [node.id, node]));
  assert.equal(map.size, nodes.length, 'IDs de nodo únicos');
  for (const reference of [...model.sources, ...model.tests, ...(model.docs || []), ...model.specs.map(spec => `openspec/specs/${spec}/spec.md`)]) {
    assert(fs.existsSync(path.join(root, reference)), `Fuente inexistente: ${reference}`);
  }
  for (const node of nodes) {
    assert(nodeTypes.has(node.type));
    assert(node.lane >= 0 && node.lane < model.lanes.length);
    if (node.type !== 'startEvent') assert(model.flows.some(flow => flow.to === node.id), `Nodo sin entrada: ${id(node.id)}`);
    if (node.type !== 'endEvent') assert(model.flows.some(flow => flow.from === node.id), `Nodo sin salida: ${id(node.id)}`);
    if (node.type === 'exclusiveGateway') {
      const outputs = model.flows.filter(flow => flow.from === node.id);
      assert(outputs.length >= 2 && outputs.every(flow => flow.label), `Compuerta sin condiciones: ${id(node.id)}`);
    }
  }
  const reached = new Set(nodes.filter(node => node.type === 'startEvent').map(node => node.id));
  for (let index = 0; index < nodes.length; index++) for (const flow of model.flows) if (reached.has(flow.from)) reached.add(flow.to);
  assert.equal(reached.size, nodes.length, `Nodos inalcanzables en ${model.id}`);
  const terminating = new Set(nodes.filter(node => node.type==='endEvent').map(node=>node.id));
  for (let index=0;index<nodes.length;index++) for (const flow of model.flows) if(terminating.has(flow.to))terminating.add(flow.from);
  assert.equal(terminating.size,nodes.length,`Recorrido sin final en ${model.id}`);
  for(const node of nodes.filter(node=>node.type==='serviceTask'))assert(model.lanes[node.lane].startsWith('Sistema'),`Tarea automática fuera del carril del sistema: ${id(node.id)}`);
  let width = Math.max(...nodes.map(node => node.x + node.w)) + 95;
  const height = 640;
  const flows = model.flows.map((flow, index) => {
    const from = map.get(flow.from), to = map.get(flow.to);
    assert(from && to);
    const a = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
    const b = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
    let points;
    if (flow.viaY !== undefined) {
      const corridor = flow.viaY === 70 ? 90 : 340;
      if (flow.viaY !== 70 && from.lane < to.lane) {
        points = [[from.x,a.y],[from.x-26,a.y],[from.x-26,corridor],[b.x+30,corridor],[b.x+30,to.y]];
      } else {
        const fromY = corridor < a.y ? from.y : from.y + from.h;
        const toY = corridor < b.y ? to.y : to.y + to.h;
        points = [[a.x, fromY],[a.x,corridor],[b.x,corridor],[b.x,toY]];
      }
    } else if (Math.abs(a.x - b.x) < 2) {
      const obstructed = nodes.some(node => ![flow.from,flow.to].includes(node.id) && a.x > node.x && a.x < node.x+node.w && node.y < Math.max(a.y,b.y) && node.y+node.h > Math.min(a.y,b.y));
      if (obstructed) {
        const corridor = Math.max(from.x+from.w,to.x+to.w)+36;
        points = [[from.x+from.w,a.y],[corridor,a.y],[corridor,b.y],[to.x+to.w,b.y]];
      } else points = [[a.x, b.y > a.y ? from.y + from.h : from.y],[b.x,b.y > a.y ? to.y : to.y + to.h]];
    } else if (Math.abs(a.y - b.y) < 2) {
      points = [[b.x > a.x ? from.x + from.w : from.x,a.y],[b.x > a.x ? to.x : to.x + to.w,b.y]];
    } else {
      const direction = b.x > a.x ? 1 : -1;
      const start = direction > 0 ? from.x + from.w : from.x;
      const end = direction > 0 ? to.x : to.x + to.w;
      const middle = (start + end) / 2;
      points = [[start,a.y],[middle,a.y],[middle,b.y],[end,b.y]];
    }
    points = points.filter((point, i) => !i || point.some((value, coordinate) => value !== points[i - 1][coordinate]));
    const segments = points.slice(1).map((point, i) => ({ a: points[i], b: point, length: Math.abs(point[0]-points[i][0]) + Math.abs(point[1]-points[i][1]) }));
    const segment = segments.toSorted((a,b) => b.length-a.length)[0];
    const vertical = segment.a[0] === segment.b[0];
    return { ...flow, id: id('flujo_' + index), points, labelX: vertical ? segment.a[0]+9 : (segment.a[0]+segment.b[0])/2-40, labelY: vertical ? (segment.a[1]+segment.b[1])/2-14 : segment.a[1]-30 };
  });
  const intersects = (a,b,gap=3) => a.x < b.x+b.w+gap && a.x+a.w > b.x-gap && a.y < b.y+b.h+gap && a.y+a.h > b.y-gap;
  const lineHits = (a,b,box) => a[0]===b[0]
    ? a[0]>box.x-2 && a[0]<box.x+box.w+2 && Math.min(a[1],b[1])<box.y+box.h+2 && Math.max(a[1],b[1])>box.y-2
    : a[1]>box.y-2 && a[1]<box.y+box.h+2 && Math.min(a[0],b[0])<box.x+box.w+2 && Math.max(a[0],b[0])>box.x-2;
  const labels = new Map();
  for(const flow of flows)for(let index=1;index<flow.points.length;index++)for(const node of nodes){
    if([flow.from,flow.to].includes(node.id))continue;
    const inner={x:node.x+4,y:node.y+4,w:node.w-8,h:node.h-8};
    assert(!lineHits(flow.points[index-1],flow.points[index],inner),`Conexión sobre un nodo ajeno: ${flow.id} / ${node.id}`);
  }
  for (const node of nodes.filter(node => node.type.endsWith('Event') || node.type==='exclusiveGateway')) {
    const center = node.x+node.w/2;
    const candidates = node.type==='exclusiveGateway'
      ? [{x:node.x-148,y:node.y-62},{x:node.x+node.w+12,y:node.y-62},{x:node.x-148,y:node.y+node.h+14},{x:node.x+node.w+12,y:node.y+node.h+14}]
      : [{x:center-70,y:node.y+node.h+10},{x:center-70,y:node.y-52},{x:node.x+node.w+10,y:node.y-4},{x:node.x-150,y:node.y-4}];
    const boxes = candidates.map(candidate => ({...candidate,w:140,h:40}));
    const label = boxes.find(box => box.x>=65 && box.y>=50 && !nodes.some(other=>intersects(box,other)) && ![...labels.values()].some(other=>intersects(box,other)) && !flows.some(flow=>flow.points.slice(1).some((point,index)=>lineHits(flow.points[index],point,box)))) || boxes[0];
    labels.set(node.id,label);
  }
  width = Math.max(width,...[...labels.values()].map(label=>label.x+label.w+25));
  const processId = id('proceso');
  const laneXML = model.lanes.map((lane,index) => `<bpmn:lane id="${id('carril_'+index)}" name="${xml(lane)}">${nodes.filter(node => node.lane===index).map(node => `<bpmn:flowNodeRef>${id(node.id)}</bpmn:flowNodeRef>`).join('')}</bpmn:lane>`).join('\n');
  const nodeXML = nodes.map(node => `<bpmn:${node.type} id="${id(node.id)}" name="${xml(node.name)}"${node.type==='exclusiveGateway'?' gatewayDirection="Diverging"':''}>
    <bpmn:documentation>${xml(node.detail)}</bpmn:documentation>
    ${flows.filter(flow => flow.to===node.id).map(flow => `<bpmn:incoming>${flow.id}</bpmn:incoming>`).join('')}
    ${flows.filter(flow => flow.from===node.id).map(flow => `<bpmn:outgoing>${flow.id}</bpmn:outgoing>`).join('')}
  </bpmn:${node.type}>`).join('\n');
  const flowXML = flows.map(flow => `<bpmn:sequenceFlow id="${flow.id}" sourceRef="${id(flow.from)}" targetRef="${id(flow.to)}"${flow.label?` name="${xml(flow.label)}"`:''}>${flow.label&&map.get(flow.from).type==='exclusiveGateway'?`<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression" language="text/plain">${xml(flow.label)}</bpmn:conditionExpression>`:''}</bpmn:sequenceFlow>`).join('\n');
  const laneDI = model.lanes.map((lane,index) => `<bpmndi:BPMNShape id="${id('carril_di_'+index)}" bpmnElement="${id('carril_'+index)}" isHorizontal="true"><dc:Bounds x="40" y="${80+index*280}" width="${width-40}" height="280"/></bpmndi:BPMNShape>`).join('\n');
  const shapeDI = nodes.map(node => {const label=labels.get(node.id);return `<bpmndi:BPMNShape id="${id(node.id+'_di')}" bpmnElement="${id(node.id)}"${node.type==='exclusiveGateway'?' isMarkerVisible="true"':''}><dc:Bounds x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}"/>${label?`<bpmndi:BPMNLabel><dc:Bounds x="${label.x}" y="${label.y}" width="${label.w}" height="${label.h}"/></bpmndi:BPMNLabel>`:''}</bpmndi:BPMNShape>`;}).join('\n');
  const edgeDI = flows.map(flow => `<bpmndi:BPMNEdge id="${flow.id}_di" bpmnElement="${flow.id}">${flow.points.map(point => `<di:waypoint x="${point[0]}" y="${point[1]}"/>`).join('')}${flow.label?`<bpmndi:BPMNLabel><dc:Bounds x="${flow.labelX}" y="${flow.labelY}" width="80" height="30"/></bpmndi:BPMNLabel>`:''}</bpmndi:BPMNEdge>`).join('\n');
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="${id('definiciones')}" targetNamespace="https://eventos.unca.edu.ar/documentacion/procesos" exporter="Eventos UNCA · documentación de procesos" exporterVersion="1">
  <bpmn:process id="${processId}" name="${xml(model.title)}" isExecutable="false">
    <bpmn:documentation>${xml(model.summary + ' Modelo descriptivo revisado el '+reviewedAt+' sobre '+revision+'.')}</bpmn:documentation>
    <bpmn:laneSet id="${id('carriles')}">${laneXML}</bpmn:laneSet>
    ${nodeXML}
    ${flowXML}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="${id('diagrama')}"><bpmndi:BPMNPlane id="${id('plano')}" bpmnElement="${processId}">${laneDI}${shapeDI}${edgeDI}</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>\n`.replace(/[ \t]+$/gm, '');
  const file = `bpmn/${model.id}.bpmn`;
  fs.writeFileSync(path.join(directory, file), content);
  return { ...model, flows, nodes: nodes.map(node => ({...node, bpmnId: id(node.id)})), file, xml: content, width, height, sha256: digest(content) };
}
const processes = models.map(build);
fs.writeFileSync(path.join(directory, 'procesos.js'), '// Generado con node docs/ingenieria-procesos/generar.mjs\nwindow.PROCESS_DOCS = '+JSON.stringify({ revision, reviewedAt, processes })+';\n');
fs.writeFileSync(path.join(directory, 'manifest.json'),JSON.stringify({ revision, reviewedAt, notation:'BPMN 2.0', executable:false, viewer:'bpmn-js@18.31.0', processes:processes.map(model=>({ id:model.id, file:model.file, nodes:model.nodes.length, flows:model.flows.length, sha256:model.sha256 })) },null,2)+'\n');
console.log(`Generados ${processes.length} procesos, ${processes.reduce((sum,model)=>sum+model.nodes.length,0)} elementos BPMN. Referencias y conectividad verificadas.`);
