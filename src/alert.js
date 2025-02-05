const alertDialog = document.querySelector('#alert-dialog');
const alertMessageSpan = document.querySelector('#alert-message');

export async function showAlert(alertMessage = 'alert!') {
  alertMessageSpan.innerHTML = alertMessage;
  alertDialog.showModal();
}