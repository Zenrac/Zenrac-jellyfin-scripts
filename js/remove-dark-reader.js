if (!document.head) {
    const head = document.createElement('head');
    document.documentElement.prepend(head);
}
const meta = document.createElement('meta');
meta.name = 'darkreader-lock';
document.head.appendChild(meta);