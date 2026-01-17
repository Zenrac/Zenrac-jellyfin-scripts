/*
    Fixes issue where plot descriptions show HTML tags instead of characters.
*/

function fixPlotDiv(div) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = div.innerHTML;
  div.innerHTML = textarea.value;
  div.dataset.fixed = "true";
}

document.querySelectorAll('.plot').forEach(div => {
  if (!div.dataset.fixed) fixPlotDiv(div);
});

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === 1) {
        if (node.matches('.plot') && !node.dataset.fixed) fixPlotDiv(node);
        node.querySelectorAll?.('.plot:not([data-fixed])').forEach(fixPlotDiv);
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });