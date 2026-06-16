import { h, useState } from '../lib/react.js';
import { Icon } from './Icons.js';

export function Accordion({ title, defaultOpen = false, children }) {
    const [open, setOpen] = useState(defaultOpen);

    return h('div', null,
        h('button', {
            type: 'button',
            onClick: () => setOpen(!open),
            className: 'flex w-full items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3 text-left transition hover:border-gray-200 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-slate-700',
        },
            h('span', { className: 'font-display text-[12px] font-bold text-gray-700 dark:text-slate-200' }, title),
            h(Icon, { name: 'chevron', className: `h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}` }),
        ),
        open && h('div', { className: 'mt-2 space-y-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900' }, children),
    );
}
