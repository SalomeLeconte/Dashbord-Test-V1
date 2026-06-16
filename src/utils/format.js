export function formatCurrency(value) {
    return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export function splitDisplayName(name) {
    const parts = name.split(' ');
    const firstName = parts.shift() || name;
    const lastName = parts.join(' ');
    return { firstName, lastName };
}

export function pluralizeCompanies(count) {
    return `${count} entreprise${count > 1 ? 's trouvées' : ' trouvée'}`;
}
