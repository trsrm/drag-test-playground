rpcClient.registerTransport(handler => window.addEventListener('message', handler));
let canvasWindow = document.querySelector('iframe').contentWindow;
let canvas = rpcClient.createSender(data => canvasWindow.postMessage(data, '*'));

let components = document.querySelectorAll('.component');
Array.from(components).forEach(component => {
    component.setAttribute('draggable', true);
    component.addEventListener('dragstart', event => {
        event.dataTransfer.effectAllowed = 'copy';
        let type = component.dataset.type;
        event.dataTransfer.setData('type', type);
        event.dataTransfer.setData('type_' + type, null);
        event.dataTransfer.setDragImage(component, 0, 0);
        canvas.method('dragStartedFromPalette')(type);
    });
    component.addEventListener('dragend', () => {
        canvas.method('dragEndedFromPalette')();
    });
});
