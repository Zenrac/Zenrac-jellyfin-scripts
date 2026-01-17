/*
    Dark Reader is a very popular extension but it causes issues with Jellyfin. 
    Using this script will tell the extension to ignore your pages.
*/

if (!document.head) {
    const head = document.createElement('head');
    document.documentElement.prepend(head);
}
const meta = document.createElement('meta');
meta.name = 'darkreader-lock';
document.head.appendChild(meta);