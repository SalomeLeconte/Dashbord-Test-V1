import { h } from '../lib/react.js';
import { Icon } from './Icons.js';

export function Header({ darkMode, onToggleTheme }) {
    return h('header', { className: 'z-20 flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950' },
        h('div', { className: 'flex items-center space-x-4' },
            h('div', { className: 'flex h-11 items-center rounded-lg bg-white px-3 shadow-sm ring-1 ring-gray-200 dark:ring-slate-700', 'aria-label': 'Komatsu' },
                h('img', { src: './assets/komatsu-logo.svg', alt: 'Komatsu', className: 'h-8 w-auto', decoding: 'async' }),
            ),
            h('div', { className: 'hidden border-l-2 border-gray-200 pl-4 dark:border-slate-700 md:block' },
                h('h1', { className: 'font-display text-sm font-bold tracking-wide text-gray-900 dark:text-white' }, 'Workspace PCS & Suivi'),
                h('p', { className: 'text-[11px] font-medium text-gray-500 dark:text-slate-400' }, 'Cartographie • Base Installée • CRM Terrain'),
            ),
        ),
        h('div', { className: 'flex items-center space-x-4' },
            h('button', {
                type: 'button',
                onClick: onToggleTheme,
                className: 'rounded-full bg-gray-100 p-2 text-gray-600 transition hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                title: darkMode ? 'Mode clair' : 'Mode sombre',
            }, h(Icon, { name: darkMode ? 'sun' : 'moon', className: 'h-5 w-5' })),
            h('div', { className: 'flex h-9 w-9 items-center justify-center rounded-full border-2 border-komatsu-500 bg-slate-800 text-komatsu-500 shadow-sm' },
                h(Icon, { name: 'database', className: 'h-5 w-5' }),
            ),
        ),
    );
}
