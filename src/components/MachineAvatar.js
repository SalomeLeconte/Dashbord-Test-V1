import { h } from '../lib/react.js';

export function MachineAvatar({ type = 'excavator', index = 0 }) {
    const accents = ['#facc15', '#eab308', '#f59e0b'];
    const accent = accents[index % accents.length];

    const body = {
        loader: [
            h('path', { key: 'loader-body', d: 'M39 48h34l8 12H37l-8-8 10-4Z', fill: accent }),
            h('path', { key: 'loader-cabin', d: 'M68 36h19l8 20H76l-8-20Z', fill: '#1e293b' }),
            h('path', { key: 'loader-bucket', d: 'M24 60h22l-10 8H18l6-8Z', fill: '#140a9a' }),
        ],
        dozer: [
            h('path', { key: 'dozer-body', d: 'M30 43h47l8 16H24l6-16Z', fill: accent }),
            h('path', { key: 'dozer-blade', d: 'M77 55h22l-8 13H71l6-13Z', fill: '#140a9a' }),
            h('path', { key: 'dozer-cabin', d: 'M31 35h24l5 12H28l3-12Z', fill: '#1e293b' }),
        ],
        excavator: [
            h('path', { key: 'exc-body', d: 'M36 44h33l7 15H30l6-15Z', fill: accent }),
            h('path', { key: 'exc-cabin', d: 'M64 33h20l8 12H70l-6-12Z', fill: '#1e293b' }),
            h('path', { key: 'exc-boom', d: 'M84 43c12 0 20 7 23 17h-9c-3-6-8-9-15-10l1-7Z', fill: '#140a9a' }),
        ],
    }[type] || [];

    return h('svg', { viewBox: '0 0 120 86', className: 'h-20 w-28 drop-shadow-sm', 'aria-hidden': true },
        h('rect', { x: 10, y: 63, width: 78, height: 8, rx: 4, fill: '#0f172a' }),
        h('circle', { cx: 34, cy: 67, r: 10, fill: '#111827' }),
        h('circle', { cx: 34, cy: 67, r: 4, fill: '#cbd5e1' }),
        h('circle', { cx: 70, cy: 67, r: 10, fill: '#111827' }),
        h('circle', { cx: 70, cy: 67, r: 4, fill: '#cbd5e1' }),
        body,
        h('path', { d: 'M20 69h73', stroke: '#475569', strokeWidth: 2, strokeLinecap: 'round' }),
    );
}
