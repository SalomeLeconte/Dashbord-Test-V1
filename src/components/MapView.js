import { h, useEffect, useRef, useState } from '../lib/react.js';
import { formatCurrency } from '../utils/format.js';
import { Icon } from './Icons.js';

export function MapView({ data, darkMode, routeActive, onToggleRoute, onOpenCrm }) {
    const mapNodeRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef(null);
    const tileLayerRef = useRef(null);
    const routeRef = useRef(null);
    const [routeTime, setRouteTime] = useState('Calcul...');
    const [routeItems, setRouteItems] = useState([]);

    useEffect(() => {
        if (!mapNodeRef.current || mapRef.current || !window.L) return;

        mapRef.current = window.L.map(mapNodeRef.current).setView([48.866667, 2.033333], 10);
        markersRef.current = window.L.layerGroup().addTo(mapRef.current);
    }, []);

    useEffect(() => {
        if (!mapRef.current || !window.L) return;

        if (tileLayerRef.current) mapRef.current.removeLayer(tileLayerRef.current);

        const url = darkMode
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        tileLayerRef.current = window.L.tileLayer(url, {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapRef.current);
    }, [darkMode]);

    useEffect(() => {
        if (!mapRef.current || !markersRef.current || !window.L) return;

        markersRef.current.clearLayers();
        const bounds = [];

        data.forEach((item) => {
            if (!item.lat || !item.lng) return;

            const colorFill = item.typeCompte === 'CL' ? '#10b981' : '#f59e0b';
            const icon = window.L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color:${colorFill};width:24px;height:24px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:10px;">${item.typeCompte}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            });

            const popup = `
                <div class="p-2 font-sans">
                    <div class="font-black text-sm tracking-tight">${item.name}</div>
                    <div class="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">${item.typeCompte === 'CL' ? 'Client' : 'Prospect'} - Dept ${item.dept}</div>
                    <div class="mt-2 text-xs font-semibold text-komatsu-600">CA PCS: ${formatCurrency(item.caPCS)}</div>
                    <div class="mt-2 text-[10px] text-gray-500">Cliquez le marqueur pour ouvrir la fiche CRM.</div>
                </div>
            `;

            const marker = window.L.marker([item.lat, item.lng], { icon }).addTo(markersRef.current);
            marker.bindPopup(popup);
            marker.on('click', () => onOpenCrm(item.id));
            bounds.push([item.lat, item.lng]);
        });

        if (bounds.length > 0) {
            mapRef.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 11 });
        }
    }, [data, onOpenCrm]);

    useEffect(() => {
        if (!mapRef.current || !window.L) return;

        if (routeRef.current) {
            mapRef.current.removeControl(routeRef.current);
            routeRef.current = null;
        }

        if (!routeActive) {
            setRouteItems([]);
            setRouteTime('Calcul...');
            return;
        }

        const sliceLimit = data.filter((item) => item.lat && item.lng).slice(0, 8);
        setRouteItems(sliceLimit);

        if (!sliceLimit.length || !window.L.Routing) {
            setRouteTime(sliceLimit.length ? 'Indisponible' : 'Aucune étape');
            return;
        }

        const waypoints = sliceLimit.map((item) => window.L.latLng(item.lat, item.lng));
        const lineColor = darkMode ? '#facc15' : '#0f172a';

        routeRef.current = window.L.Routing.control({
            waypoints,
            routeWhileDragging: false,
            addWaypoints: false,
            lineOptions: { styles: [{ color: lineColor, weight: 5, opacity: 0.9 }] },
            createMarker: () => null,
        }).addTo(mapRef.current);

        routeRef.current.on('routesfound', (event) => {
            const summary = event.routes[0].summary;
            const totalMins = Math.round(summary.totalTime / 60);
            setRouteTime(`${Math.floor(totalMins / 60)}h ${totalMins % 60}min`);
        });
    }, [data, darkMode, routeActive]);

    return h('div', { className: 'absolute inset-0' },
        h('div', { id: 'map', ref: mapNodeRef, className: 'z-0' }),
        routeActive && h('div', { className: 'absolute right-4 top-4 z-[1000] flex max-h-[90%] w-[340px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/95' },
            h('div', { className: 'flex shrink-0 items-center justify-between border-b border-gray-100 p-4 dark:border-slate-800' },
                h('h3', { className: 'flex items-center gap-2 font-display font-bold text-gray-900 dark:text-white' },
                    h(Icon, { name: 'route', className: 'h-5 w-5 text-komatsu-500' }),
                    'Itinéraire Routier',
                ),
                h('button', { type: 'button', onClick: onToggleRoute, className: 'rounded-full bg-gray-100 p-1 text-gray-400 transition hover:text-gray-700 dark:bg-slate-800 dark:hover:text-white' },
                    h(Icon, { name: 'close', className: 'h-4 w-4' }),
                ),
            ),
            h('div', { className: 'flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300' },
                h('span', { className: 'font-medium' }, 'Durée de route estimée :'),
                h('span', { className: 'font-display text-sm font-black text-komatsu-600 dark:text-komatsu-400' }, routeTime),
            ),
            h('div', { className: 'flex-1 space-y-4 overflow-y-auto p-4 text-xs' },
                h('div', { className: 'mb-2 pl-2 text-xs font-bold text-gray-500' }, `Étapes (${routeItems.length} entreprises) :`),
                routeItems.map((item, index) => h('div', { key: item.id, className: 'relative border-l-2 border-gray-200 pb-5 pl-5 last:pb-0 dark:border-slate-700' },
                    h('div', { className: 'absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-komatsu-500 bg-white dark:bg-slate-800' }),
                    h('div', { className: 'text-xs font-bold text-gray-900 dark:text-white' }, `${index + 1}. ${item.name}`),
                    h('div', { className: 'mt-0.5 text-[9px] text-gray-400 dark:text-slate-400' }, `${item.ville} (${item.dept})`),
                )),
            ),
        ),
    );
}
