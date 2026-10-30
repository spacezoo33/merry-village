export type Decoration = 'train' | 'tree' | 'santa' | 'snowman' | 'village';
export type Icon = Decoration | 'music' | 'snow' | 'sun' | 'moon';
const paths: Record<Icon, string> = {
 music:'<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/>',
 snow:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M20 14l-4 1 1 4M4 14l4 1-1 4M20 10l-4-1 1-4"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 moon:'<path d="M20.7 14A9 9 0 0 1 10 3.3 9 9 0 1 0 20.7 14Z"/>',
 train:'<rect x="3" y="9" width="11" height="9" rx="2"/><path d="M5 9V5h7v4m2 3h5l2 6H3m13-6V8h3v4"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/>',
 tree:'<path d="m12 2-5 6h3l-6 7h4l-5 5h18l-5-5h4l-6-7h3Z"/><path d="M12 20v3"/>',
 santa:'<path d="M5 10c0-4 2-7 7-7l7 6M4 10h16v3H4Z"/><path d="M5 13v3c0 4 4 6 7 6s7-2 7-6v-3M9 15h.01M15 15h.01m-5 3h4"/><circle cx="20" cy="8" r="2"/>',
 snowman:'<circle cx="12" cy="8" r="4"/><ellipse cx="12" cy="18" rx="7" ry="5"/><path d="M7 4h10M9 4V1h6v3m-5 4h.01M14 8h.01M12 17h.01M12 20h.01M8 12l9 1"/>',
 village:'<path d="m2 12 6-6 6 6M4 10v11h8V10m1-3 4-4 5 5m-7 2v11h6V8M7 21v-6h3v6m7-9h2v3h-2"/>',
};
export function icon(name: Icon): string {
 return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
