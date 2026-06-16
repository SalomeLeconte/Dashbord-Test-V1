import { h, useCallback, useEffect, useMemo, useState } from './lib/react.js';
import { komatsuDatabase } from './data/komatsuDatabase.js';
import { pssrAssignments } from './data/pssrAssignments.js';
import { pluralizeCompanies } from './utils/format.js';
import { Header } from './components/Header.js';
import { PssrSelector } from './components/PssrSelector.js';
import { FiltersSidebar } from './components/FiltersSidebar.js';
import { DataTable } from './components/DataTable.js';
import { CrmDrawer } from './components/CrmDrawer.js';
import { MapView } from './components/MapView.js';
import { Icon } from './components/Icons.js';

const defaultFilters = {
    top200: false,
    newMachine: false,
    typeCompte: '',
    nom: '',
    ville: '',
    caMin: 0,
    serial: '',
    modele: '',
};

export function App() {
    const [darkMode, setDarkMode] = useState(false);
    const [activePssr, setActivePssr] = useState(null);
    const [selectorOpen, setSelectorOpen] = useState(true);
    const [filters, setFilters] = useState(defaultFilters);
    const [activeTab, setActiveTab] = useState('table');
    const [routeActive, setRouteActive] = useState(false);
    const [crmId, setCrmId] = useState(null);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
    }, [darkMode]);

    const filteredData = useMemo(() => {
        const normalizedName = filters.nom.toLowerCase();
        const normalizedVille = filters.ville.toLowerCase();
        const normalizedSerial = filters.serial.toLowerCase();
        const normalizedModele = filters.modele.toLowerCase();

        return komatsuDatabase.filter((row) => {
            if (activePssr && !activePssr.departments.includes(String(row.dept))) return false;
            if (filters.top200 && !row.isTop200) return false;
            if (filters.newMachine && !row.isNewMachine) return false;
            if (filters.typeCompte && row.typeCompte !== filters.typeCompte) return false;
            if (normalizedName && !row.name.toLowerCase().includes(normalizedName)) return false;
            if (normalizedVille && !row.ville.toLowerCase().includes(normalizedVille)) return false;
            if (filters.caMin > 0 && row.caPCS < filters.caMin) return false;
            if (normalizedSerial && !row.serials.toLowerCase().includes(normalizedSerial)) return false;
            if (normalizedModele && !row.machines.toLowerCase().includes(normalizedModele)) return false;
            return true;
        });
    }, [activePssr, filters]);

    useEffect(() => {
        if (routeActive) setRouteActive(false);
    }, [filters, activePssr]);

    const selectedCrm = useMemo(
        () => komatsuDatabase.find((row) => row.id === crmId) || null,
        [crmId],
    );

    const selectPssr = useCallback((person) => {
        setActivePssr(person);
        setSelectorOpen(false);
    }, []);

    return h('div', { className: 'flex h-screen flex-col overflow-hidden bg-gray-50 text-gray-800 dark:bg-slate-900 dark:text-slate-100' },
        h(Header, { darkMode, onToggleTheme: () => setDarkMode((value) => !value) }),
        h(PssrSelector, { assignments: pssrAssignments, isOpen: selectorOpen, onSelect: selectPssr }),
        h('div', { className: 'relative flex flex-1 overflow-hidden' },
            h(FiltersSidebar, {
                filters,
                onFilterChange: setFilters,
                onReset: () => setFilters(defaultFilters),
                activePssr,
                onOpenPssrSelector: () => setSelectorOpen(true),
            }),
            h('main', { className: 'relative flex min-w-0 flex-1 flex-col space-y-4 overflow-hidden bg-gray-50 p-4 dark:bg-slate-900 md:p-6' },
                h('div', { className: 'flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:p-3' },
                    h('div', { className: 'flex items-center space-x-3 pl-2' },
                        h('div', { className: 'h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' }),
                        h('span', { className: 'font-display text-sm font-bold text-gray-800 dark:text-white' }, pluralizeCompanies(filteredData.length)),
                    ),
                    h('div', { className: 'flex items-center space-x-3' },
                        activeTab === 'map' && h('button', {
                            type: 'button',
                            onClick: () => setRouteActive((value) => !value),
                            className: 'flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-slate-700 dark:border-slate-600',
                        },
                            h(Icon, { name: 'bolt', className: 'h-4 w-4 text-komatsu-500' }),
                            routeActive ? 'Masquer Trajet' : 'Calculer Trajet Routier (Max 8)',
                        ),
                        h('div', { className: 'flex space-x-1 rounded-xl border border-gray-200 bg-gray-100 p-1.5 dark:border-slate-800 dark:bg-slate-900' },
                            h('button', { type: 'button', onClick: () => setActiveTab('table'), className: tabClass(activeTab === 'table') }, 'Données (Tableau)'),
                            h('button', { type: 'button', onClick: () => setActiveTab('map'), className: tabClass(activeTab === 'map') }, 'Cartographie'),
                        ),
                    ),
                ),
                h('div', { className: 'relative flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950' },
                    activeTab === 'table'
                        ? h(DataTable, { data: filteredData, onOpenCrm: setCrmId })
                        : h(MapView, { data: filteredData, darkMode, routeActive, onToggleRoute: () => setRouteActive(false), onOpenCrm: setCrmId }),
                ),
            ),
            h(CrmDrawer, { row: selectedCrm, onClose: () => setCrmId(null) }),
        ),
    );
}

function tabClass(active) {
    const base = 'rounded-lg px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all';
    return active
        ? `${base} border border-gray-200 bg-white text-gray-800 shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white`
        : `${base} text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white`;
}
