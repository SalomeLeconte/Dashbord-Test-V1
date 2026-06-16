import { h } from '../lib/react.js';
import { splitDisplayName } from '../utils/format.js';
import { MachineAvatar } from './MachineAvatar.js';

export function PssrSelector({ assignments, isOpen, onSelect }) {
    if (!isOpen) return null;

    return h('section', { className: 'fixed inset-x-0 bottom-0 top-[69px] z-40 overflow-y-auto bg-gray-50/95 backdrop-blur-xl dark:bg-slate-950/95' },
        h('div', { className: 'mx-auto flex min-h-full max-w-6xl flex-col px-6 py-8' },
            h('div', { className: 'mb-6 flex flex-col gap-3 border-b border-gray-200 pb-5 dark:border-slate-800 md:flex-row md:items-end md:justify-between' },
                h('div', null,
                    h('p', { className: 'text-[11px] font-bold uppercase tracking-[0.22em] text-komatsu-600 dark:text-komatsu-400' }, 'Sélection nominative'),
                    h('h2', { className: 'mt-2 font-display text-2xl font-black tracking-tight text-gray-950 dark:text-white' }, 'Choisir votre secteur PSSR'),
                    h('p', { className: 'mt-1 max-w-2xl text-sm text-gray-500 dark:text-slate-400' }, 'Chaque profil charge automatiquement les départements attribués dans le fichier PSSR.'),
                ),
                h('button', {
                    type: 'button',
                    onClick: () => onSelect(null),
                    className: 'self-start rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 shadow-sm transition hover:border-komatsu-400 hover:text-gray-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white md:self-auto',
                }, 'Voir tous les départements'),
            ),
            h('div', { className: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' },
                assignments.map((person, index) => {
                    const display = splitDisplayName(person.name);
                    const departmentPreview = person.departments.slice(0, 6).join(', ');
                    const remaining = person.departments.length > 6 ? ` +${person.departments.length - 6}` : '';

                    return h('button', {
                        key: person.name,
                        type: 'button',
                        onClick: () => onSelect(person),
                        className: 'group min-h-[190px] rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-komatsu-400 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-komatsu-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-komatsu-500',
                    },
                        h('div', { className: 'flex items-start justify-between gap-4' },
                            h('div', null,
                                h('div', { className: 'text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-slate-500' }, 'PSSR'),
                                h('div', { className: 'mt-2 font-display text-xl font-black leading-tight text-gray-950 dark:text-white' },
                                    h('span', { className: 'block' }, display.firstName),
                                    h('span', { className: 'block text-komatsu-700 dark:text-komatsu-400' }, display.lastName),
                                ),
                            ),
                            h('div', { className: 'rounded-xl bg-gray-50 p-2 ring-1 ring-gray-100 transition group-hover:bg-komatsu-50 dark:bg-slate-950 dark:ring-slate-800 dark:group-hover:bg-slate-800' },
                                h(MachineAvatar, { type: person.machine, index }),
                            ),
                        ),
                        h('div', { className: 'mt-4 rounded-lg bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-500 dark:bg-slate-950 dark:text-slate-400' },
                            `Dept. ${departmentPreview}${remaining}`,
                        ),
                    );
                }),
            ),
        ),
    );
}
