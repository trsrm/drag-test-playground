rpcServer.registerTransport(
    (handler) => window.addEventListener('message', handler),
    (event, data) => event.source.postMessage(data, '*')
);
rpcServer.registerApi({
    dragStartedFromPalette: (type) => {
        document.body.classList.add('drag-in-progress');
        dropInfo = {};
        draggedComponentType = type;
    },
    dragEndedFromPalette: () => {
        document.body.classList.remove('drag-in-progress');
        draggedComponentType = null;
        removePlaceholders();
    }
});

let placeholder, dropInfo, draggedComponentType;
let bodyOverlay = createBodyOverlay();
bodyOverlay.addEventListener('dragover', event => {
    if (dragOver(event.pageX, event.pageY)) {
        event.preventDefault();
    }
});
bodyOverlay.addEventListener('dragleave', event => {
    dragLeave(event.pageX, event.pageY);
});
bodyOverlay.addEventListener('drop', event => {
    let type = event.dataTransfer.getData('type');
    drop(type);
});

// ------------------------------------------------------------------------------------------------

function createBodyOverlay() {
    let bodyOverlay = document.createElement('div');
    bodyOverlay.classList.add('overlay-body');
    document.body.appendChild(bodyOverlay);
    return bodyOverlay;
}

function dragOver(x, y) {
    let targetCmptInfo = getInfoAtPoint(x, y);
    if (!targetCmptInfo) {
        return false;
    }
    if (isPlaceHolderAtPoint(x, y)) {
        return true;
    }
    placeholder = createPlaceholder(draggedComponentType);
    if (targetCmptInfo.isContainer) {
        onTargetIsContainer(targetCmptInfo, x, y);
    } else {
        onTargetIsNotContainer(targetCmptInfo, draggedComponentType);
    }
    updatePlaceholder();
    return true;
}

function getInfoAtPoint(x, y) {
    let componentElement = getNonOverlayElementAtPoint(x, y);
    if (!componentElement) {
        return null;
    }
    let info = {};
    info.type = getTypeByElement(componentElement);
    info.isContainer = isContainer(info.type);
    info.element = componentElement;
    let vertPos, horizPos;
    let edgeDistance = 15;
    let rect = componentElement.getBoundingClientRect();
    if (y < (rect.top + rect.bottom) / 2) {
        vertPos = 'top';
        if (info.isContainer && info.type !== 'content') {
            if (y <= rect.top + edgeDistance) vertPos += '-edge';
        }
    } else {
        vertPos = 'bottom';
        if (info.isContainer && info.type !== 'content') {
            if (y >= rect.bottom - edgeDistance) vertPos += '-edge';
        }
    }
    if (x < (rect.left + rect.right) / 2) {
        horizPos = 'left';
        if (info.isContainer && info.type !== 'content') {
            if (x <= rect.left + edgeDistance) horizPos += '-edge';
        }
    } else {
        horizPos = 'right';
        if (info.isContainer && info.type !== 'content') {
            if (x >= rect.right - edgeDistance) horizPos += '-edge';
        }
    }
    info.v = vertPos;
    info.h = horizPos;
    return info;
}

function getNonOverlayElementAtPoint(x, y) {
    let arrElements = document.elementsFromPoint(x, y);
    for (let element of arrElements) {
        if (element.nodeName !== 'BODY' && element.className !== 'overlay-body') {
            return element;
        }
    }
}

function getTypeByElement(componentElement) {
    switch (componentElement.tagName) {
    case 'DIV':
        return 'div';
    case 'INPUT':
        return 'input';
    case 'BUTTON':
        return 'button';
    case 'SPAN':
        return 'text';
    }
}

function isContainer(componentType) {
    return componentType === 'div';
}

function isPlaceHolderAtPoint(x, y) {
    let element = getNonOverlayElementAtPoint(x, y);
    return element.classList.contains('drop-target-placeholder');
}

function createPlaceholder(componentType) {
    let placeholder = document.createElement('div');
    placeholder.classList.add('drop-target-placeholder', componentType);
    return placeholder;
}

function onTargetIsContainer(targetCmptInfo, x, y) {
    let isTargetInline = isComponentInline(targetCmptInfo.type);
    if (isTargetInline) {
        if (targetCmptInfo.h === 'left-edge') {
            dropInfo.location = 'before';
        } else if (targetCmptInfo.h === 'right-edge') {
            dropInfo.location = 'after';
        } else {
            dropInfo.location = 'last';
        }
    } else {
        if (targetCmptInfo.v === 'top-edge') {
            dropInfo.location = 'before';
        } else if (targetCmptInfo.v === 'bottom-edge') {
            dropInfo.location = 'after';
        } else {
            dropInfo.location = 'last';
        }
    }
    if (dropInfo.location === 'last') {
        dropInfo.sibling = null;
        dropInfo.parent = getNonOverlayElementAtPoint(x, y);
    } else {
        dropInfo.sibling = targetCmptInfo.element;
        dropInfo.parent = targetCmptInfo.element.parentElement;
    }
}

function onTargetIsNotContainer(targetCmptInfo, dragCmptType) {
    let isDragInline = isComponentInline(dragCmptType);
    let isTargetInline = isComponentInline(targetCmptInfo.type);
    if (isDragInline && isTargetInline) {
        if (targetCmptInfo.h.indexOf('left') === 0) {
            dropInfo.location = 'before';
        } else {
            dropInfo.location = 'after';
        }
    } else {
        if (targetCmptInfo.v.indexOf('top') === 0) {
            dropInfo.location = 'before';
        } else {
            dropInfo.location = 'after';
        }
    }
    dropInfo.sibling = targetCmptInfo.element;
    dropInfo.parent = targetCmptInfo.element.parentElement;
}

function isComponentInline(type) {
    return type !== 'div';
}

function updatePlaceholder() {
    removePlaceholders();
    if (dropInfo.location === 'before') {
        dropInfo.parent.insertBefore(placeholder, dropInfo.sibling);
    } else if (dropInfo.location === 'after') {
        let nextElement = dropInfo.sibling.nextElementSibling;
        if (nextElement) {
            dropInfo.parent.insertBefore(placeholder, nextElement);
        } else {
            dropInfo.sibling = null;
            dropInfo.location = 'last';
        }
    }
    if (dropInfo.location === 'last' && dropInfo.parent) {
        dropInfo.parent.appendChild(placeholder);
    }
}

function removePlaceholders() {
    let placeholders = document.querySelectorAll('.drop-target-placeholder');
    for (let i = 0; i < placeholders.length; i++) {
        placeholders[i].parentNode.removeChild(placeholders[i]);
    }
}

function dragLeave(x, y) {
    let elementLeavingFor = getNonOverlayElementAtPoint(x, y);
    if (!elementLeavingFor || elementLeavingFor.className.indexOf('drop-target-placeholder') === -1) {
        removePlaceholders();
    }
}

function drop(type) {
    let cmptElem = createElementForType(type);
    placeComponent(cmptElem, dropInfo.location, dropInfo.sibling, dropInfo.parent);
}

function placeComponent(cmptElem, location, siblingCmpt, parentCmpt) {
    switch (location) {
    case 'before':
        siblingCmpt.parentNode.insertBefore(cmptElem, siblingCmpt);
        break;
    case 'after':
        insertAfter(cmptElem, siblingCmpt);
        break;
    case 'last':
    default:
        parentCmpt.appendChild(cmptElem);
        break;
    }
}

function createElementForType(type) {
    let temp = document.createElement('div');
    switch (type) {
    case 'div':
        temp.innerHTML = '<div></div>';
        break;
    case 'input':
        temp.innerHTML = '<input type="text">';
        break;
    case 'text':
        temp.innerHTML = '<span>Some text</span>';
        break;
    case 'button':
        temp.innerHTML = '<button>Button</button>';
        break;
    }
    return temp.firstChild;
}

function insertAfter(elem, refElem) {
    let parent = refElem.parentNode;
    let next = refElem.nextSibling;
    if (next) {
        return parent.insertBefore(elem, next);
    } else {
        return parent.appendChild(elem);
    }
}