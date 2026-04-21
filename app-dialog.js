(function () {
  let activeDialog = null;

  function ensureDialog() {
    if (activeDialog) {
      activeDialog.remove();
      activeDialog = null;
    }

    const dialog = document.createElement('div');
    dialog.className = 'app-dialog';
    dialog.innerHTML = `
      <div class="app-dialog-box" role="dialog" aria-modal="true">
        <h3 class="app-dialog-title"></h3>
        <p class="app-dialog-message"></p>
        <div class="app-dialog-actions"></div>
      </div>
    `;

    document.body.appendChild(dialog);
    activeDialog = dialog;
    return dialog;
  }

  function closeDialog(result) {
    if (activeDialog) {
      activeDialog.remove();
      activeDialog = null;
    }

    return result;
  }

  function show({ title, message, buttons }) {
    return new Promise(resolve => {
      const previousFocus = document.activeElement;
      const dialog = ensureDialog();
      const titleEl = dialog.querySelector('.app-dialog-title');
      const messageEl = dialog.querySelector('.app-dialog-message');
      const actionsEl = dialog.querySelector('.app-dialog-actions');

      titleEl.textContent = title || 'Aviso';
      messageEl.textContent = message || '';
      actionsEl.innerHTML = '';

      buttons.forEach(button => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = button.primary ? 'btn btn-primary' : 'btn btn-secondary';
        btn.textContent = button.label;
        btn.onclick = () => {
          const result = closeDialog(button.value);
          resolve(result);

          if (button.focusAfter) {
            setTimeout(button.focusAfter, 80);
          } else if (previousFocus?.focus) {
            setTimeout(() => previousFocus.focus(), 80);
          }
        };
        actionsEl.appendChild(btn);
      });

      const primaryButton = actionsEl.querySelector('.btn-primary') || actionsEl.querySelector('button');
      setTimeout(() => primaryButton?.focus(), 0);

      dialog.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          const cancelButton = buttons.find(button => button.cancel) || buttons[buttons.length - 1];
          const result = closeDialog(cancelButton.value);
          resolve(result);
        }
      });
    });
  }

  window.appDialog = {
    alert({ title = 'Aviso', message = '', focusAfter } = {}) {
      return show({
        title,
        message,
        buttons: [
          { label: 'Aceptar', value: true, primary: true, focusAfter }
        ]
      });
    },

    confirm({ title = 'Confirmar', message = '', confirmLabel = 'Aceptar', cancelLabel = 'Cancelar', focusAfter } = {}) {
      return show({
        title,
        message,
        buttons: [
          { label: cancelLabel, value: false, cancel: true },
          { label: confirmLabel, value: true, primary: true, focusAfter }
        ]
      });
    }
  };
})();
