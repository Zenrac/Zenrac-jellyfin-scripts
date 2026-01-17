/*
    When playing a video theme song (Settings > Display > Theme videos), adds a button to open the video player in a popup overlay.
*/

function showVideoPopup(container) {
  if (!container) return
  if (!container._controlsInterval) {
    container._controlsInterval = setInterval(function() {
      container.querySelectorAll('video').forEach(function(v){ v.controls = true })
    }, 300)
  }

  var overlay = document.createElement('div')
  overlay.id = 'videoOverlay'
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '98',
    opacity: '0',
    transition: 'opacity 0.3s',
  })
  document.body.appendChild(overlay)

  var wrapper = document.createElement('div')
  Object.assign(wrapper.style, {
    width: '80%',
    height: '80%',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    transform: 'scale(0.8)',
    transition: 'transform 0.3s',
    position: 'relative',
    zIndex: '99',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  })

  var originalParent = container.parentNode
  var nextSibling = container.nextSibling
  wrapper.appendChild(container)
  overlay.appendChild(wrapper)

  requestAnimationFrame(function() {
    overlay.style.opacity = '1'
    wrapper.style.transform = 'scale(1)'
  })

  function closePopup() {
    overlay.style.opacity = '0'
    wrapper.style.transform = 'scale(0.8)'
    setTimeout(function() {
      if (originalParent) {
        if (nextSibling) originalParent.insertBefore(container, nextSibling)
        else originalParent.appendChild(container)
      }
      overlay.remove()
      clearInterval(checkInterval)
    }, 300)
    overlay.removeEventListener('click', overlayClick)
    document.removeEventListener('keydown', escHandler)
  }

  function overlayClick(e) {
    if (e.target === overlay) closePopup()
  }

  function escHandler(e) {
    if (e.key === 'Escape') closePopup()
  }

  overlay.addEventListener('click', overlayClick)
  document.addEventListener('keydown', escHandler)

  var checkInterval = setInterval(function() {
    if (!document.querySelector('.videoPlayerContainer:not(.themeVideoPlayerContainer)')) closePopup()
  }, 300)
}

setInterval(function() {
    var videoContainer = document.querySelector('.videoPlayerContainer:not(.themeVideoPlayerContainer)');
    if (!videoContainer) return 

    var containers = document.querySelectorAll('.mainDetailButtons.focuscontainer-x')
    var buttonContainer = Array.from(containers).find(c => c.clientWidth > 0 && c.clientHeight > 0)
    if (!buttonContainer) return

    var existingBtn = buttonContainer.querySelector('#videoPopupBtn')
    var isHidden = existingBtn ? existingBtn.clientWidth === 0 && existingBtn.clientHeight === 0 : true
    if (!existingBtn || isHidden) {
        if (existingBtn) existingBtn.remove()
        var popupBtn = document.createElement('button')
        popupBtn.id = 'videoPopupBtn'
        popupBtn.type = 'button'
        popupBtn.className = 'button-flat detailButton emby-button'
        popupBtn.title = 'Open Video Popup'
        popupBtn.innerHTML = '<div class="detailButton-content"><span class="material-icons detailButton-icon open_in_full" aria-hidden="true"></span></div>'
        buttonContainer.appendChild(popupBtn)
        popupBtn.addEventListener('click', function() {
            var c = document.querySelector('.videoPlayerContainer')
            if (!c) return
            if (c.closest('#videoOverlay')) return
            showVideoPopup(c)
        })
    }
}, 300)