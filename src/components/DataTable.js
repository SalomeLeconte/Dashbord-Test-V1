import { h } from '../lib/react.js';
import { formatCurrency } from '../utils/format.js';
import { Icon } from './Icons.js';

function AccountBadge({ type }) {
    const isClient = type === 'CL';
    return h('div', {
        className: `flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
            isClient
                ? 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                : 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400'
        }`,
    }, type);
}

export function DataTable({ data, onOpenCrm }) {
    return h('div', { className: 'absolute inset-0 overflow-auto' },
        h('table', { className: 'w-full min-w-[1000px] border-collapse text-left' },
            h('thead', null,
                h('tr', { className: 'sticky top-0 z-10 border-b border-gray-200 bg-gray-50/90 text-[10px] font-bold uppercase tracking-widest text-gray-500 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400' },
                    h('th', { className: 'p-4 pl-6' }, 'Client / Prospect'),
                    h('th', { className: 'p-4' }, 'Détails CRM'),
                    h('th', { className: 'p-4' }, 'Localisation'),
                    h('th', { className: 'p-4 text-right' }, 'CA PCS'),
                    h('th', { className: 'p-4' }, 'Flotte Identifiée'),
                    h('th', { className: 'p-4 pr-6 text-center' }, 'Action'),
                ),
            ),
            h('tbody', { className: 'divide-y divide-gray-100 text-sm text-gray-700 dark:divide-slate-800/50 dark:text-slate-300' },
                data.map((row) => h('tr', {
                    key: row.id,
                    onClick: () => onOpenCrm(row.id),
                    className: 'cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/40',
                },
                    h('td', { className: 'p-4 pl-6' },
                        h('div', { className: 'flex items-center space-x-3' },
                            h(AccountBadge, { type: row.typeCompte }),
                            h('div', null,
                                h('div', { className: 'flex items-center gap-1.5 text-xs font-extrabold tracking-tight' },
                                    row.name,
                                    row.isTop200 && h('span', { className: 'rounded bg-amber-500 px-1 py-0.5 text-[9px] font-black tracking-wider text-slate-950' }, 'TOP'),
                                    row.isNewMachine && h('span', { className: 'rounded bg-purple-600 px-1 py-0.5 text-[9px] font-black tracking-wider text-white' }, 'MACHINE'),
                                ),
                                h('div', { className: 'mt-0.5 text-[10px] font-medium text-gray-400 dark:text-slate-500' }, `Client N° ${row.clientNum}`),
                            ),
                        ),
                    ),
                    h('td', { className: 'p-4' },
                        h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500' }, 'Contact'),
                        h('div', { className: 'mt-0.5 text-xs font-bold' }, row.vendeur),
                    ),
                    h('td', { className: 'p-4' },
                        h('div', { className: 'flex items-center gap-1 font-semibold' },
                            h(Icon, { name: 'mapPin', className: 'h-3.5 w-3.5 shrink-0 text-komatsu-500' }),
                            h('span', { className: 'max-w-[150px] truncate' }, row.ville),
                        ),
                        h('div', { className: 'mt-0.5 font-mono text-[10px] text-gray-400 dark:text-slate-500' }, `Dept ${row.dept}`),
                    ),
                    h('td', { className: 'p-4 text-right' },
                        h('div', { className: 'font-display text-xs font-black tracking-tight text-komatsu-600 dark:text-komatsu-400' }, formatCurrency(row.caPCS)),
                        h('div', { className: 'mt-0.5 text-[10px] font-medium text-gray-400 dark:text-slate-500' }, `Global: ${formatCurrency(row.caGlobal)}`),
                    ),
                    h('td', { className: 'p-4' },
                        h('div', { className: 'max-w-[180px] truncate text-xs font-medium' }, row.machines || '—'),
                        h('div', { className: 'mt-0.5 text-[9px] font-mono uppercase tracking-wide text-gray-400 dark:text-slate-500' }, `N/S: ${row.serials || '—'}`),
                    ),
                    h('td', { className: 'p-4 pr-6 text-center' },
                        h('button', {
                            type: 'button',
                            onClick: (event) => {
                                event.stopPropagation();
                                onOpenCrm(row.id);
                            },
                            className: 'rounded-lg border border-gray-200 bg-gray-100 p-1.5 text-gray-600 shadow-sm transition-all hover:bg-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
                            title: 'Voir la fiche CRM',
                        }, h(Icon, { name: 'eye', className: 'h-4 w-4' })),
                    ),
                )),
            ),
        ),
    );
}
