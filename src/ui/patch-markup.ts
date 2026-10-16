/** Reconcile screens without navigation, replacing only elements whose structure changed. */
export function patchMarkup(host: HTMLElement, html: string): void {
  const template = document.createElement('template'); template.innerHTML = html;
  function patch(parent: Node, incoming: Node) {
    const fresh = [...incoming.childNodes];
    fresh.forEach((next, i) => {
      const current = parent.childNodes[i];
      if (!current) { parent.appendChild(next.cloneNode(true)); return; }
      if (current.nodeType !== next.nodeType || current.nodeName !== next.nodeName || current instanceof Element && next instanceof Element && current.id !== next.id) { parent.replaceChild(next.cloneNode(true), current); return; }
      if (!(current instanceof Element) || !(next instanceof Element)) { if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue; return; }
      for (const attr of [...current.attributes]) if (!next.hasAttribute(attr.name)) current.removeAttribute(attr.name);
      for (const attr of [...next.attributes]) if (current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name, attr.value);
      patch(current, next);
    });
    while (parent.childNodes.length > fresh.length) parent.removeChild(parent.lastChild!);
  }
  const drafts = [...host.querySelectorAll<HTMLInputElement | HTMLSelectElement>('#create input, #create select, #train select')].map(input => ({ form: input.closest('form')!.id, name: input.name, value: input.value }));
  patch(host, template.content);
  for (const draft of drafts) { const input = host.querySelector<HTMLInputElement | HTMLSelectElement>(`#${draft.form} [name="${draft.name}"]`); if (input && (!(input instanceof HTMLSelectElement) || [...input.options].some(option=>option.value===draft.value))) input.value = draft.value; }
}
