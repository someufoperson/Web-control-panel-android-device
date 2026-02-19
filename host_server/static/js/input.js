class ScrcpyInput {
    constructor(callback, videoElement, width, height, debug = false) {
        this.callback = callback
        this.width = width
        this.height = height
        this.debug = debug
        let mouseX = null;
        let mouseY = null;
        let leftButtonIsPressed = false;
        let rightButtonIsPressed = false;

        // Метод throttle для ограничения частоты вызовов
        this.throttle = (func, limit) => {
            let inThrottle;
            return (...args) => {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        };

        document.addEventListener('mousedown', (event) => {
            const rect = videoElement.getBoundingClientRect();
            const local_x = event.clientX - rect.left;
            const local_y = event.clientY - rect.top;

            if (videoElement.contains(event.target)) {
                if (event.button === 0) {
                    leftButtonIsPressed = true;

                    mouseX = (local_x / (rect.right - rect.left)) * this.width;
                    mouseY = (local_y / (rect.bottom - rect.top)) * this.height;

                    let data = this.createTouchProtocolData(0, mouseX, mouseY, this.width, this.height, 0, 0, 65535);
                    this.callback(data);
                } else if (event.button === 2) {
                    rightButtonIsPressed = true;

                    this.snedKeyCode(event, 0, 4);
                    event.preventDefault();
                }
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (!leftButtonIsPressed) return;

            const rect = videoElement.getBoundingClientRect();
            const local_x = event.clientX - rect.left;
            const local_y = event.clientY - rect.top;

            if (event.button === 0) {
                leftButtonIsPressed = false;

                if (videoElement.contains(event.target)) {
                    mouseX = (local_x / (rect.right - rect.left)) * this.width;
                    mouseY = (local_y / (rect.bottom - rect.top)) * this.height;
                }

                let data = this.createTouchProtocolData(1, mouseX, mouseY, this.width, this.height, 0, 0, 0);
                this.callback(data);

            } else if (event.button === 2 && rightButtonIsPressed) {
                rightButtonIsPressed = false;

                this.snedKeyCode(event, 1, 4);
                event.preventDefault();
            }
        });

        // --- Throttled mousemove ---
        const rawMouseMoveHandler = (event) => {
            if (!leftButtonIsPressed) return;

            const rect = videoElement.getBoundingClientRect();
            const local_x = event.clientX - rect.left;
            const local_y = event.clientY - rect.top;

            if (videoElement.contains(event.target)) {
                mouseX = (local_x / (rect.right - rect.left)) * this.width;
                mouseY = (local_y / (rect.bottom - rect.top)) * this.height;

                let data = this.createTouchProtocolData(2, mouseX, mouseY, this.width, this.height, 0, 0, 65535);
                this.callback(data);
            }
        };
        const throttledMouseMove = this.throttle(rawMouseMoveHandler, 20); // 20 мс ≈ 50 раз/сек
        document.addEventListener('mousemove', throttledMouseMove);

        // --- (Опционально) Throttled touchmove для сенсорных экранов ---
        // Если понадобится поддержка касаний, раскомментируйте блок ниже
        /*
        const rawTouchMoveHandler = (event) => {
            event.preventDefault();
            if (!leftButtonIsPressed) return; // можно использовать свой флаг для касаний
            const rect = videoElement.getBoundingClientRect();
            const touch = event.touches[0];
            const local_x = touch.clientX - rect.left;
            const local_y = touch.clientY - rect.top;

            if (videoElement.contains(touch.target)) {
                mouseX = (local_x / (rect.right - rect.left)) * this.width;
                mouseY = (local_y / (rect.bottom - rect.top)) * this.height;

                let data = this.createTouchProtocolData(2, mouseX, mouseY, this.width, this.height, 0, 0, 65535);
                this.callback(data);
            }
        };
        const throttledTouchMove = this.throttle(rawTouchMoveHandler, 20);
        videoElement.addEventListener('touchmove', throttledTouchMove);
        */

        videoElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        // --- Throttled wheel ---
        const rawWheelHandler = (event) => {
            const hScroll = event.deltaX;
            const vScroll = event.deltaY;
            const deltaMode = event.deltaMode;
            const deltaZ = event.deltaZ;
            const clientX = event.clientX;
            const clientY = event.clientY;
            const button = event.button;

            const rect = videoElement.getBoundingClientRect();
            const relativeX = clientX - rect.left;
            const relativeY = clientY - rect.top;
            const width = rect.right - rect.left;
            const height = rect.bottom - rect.top;

            let data = this.createScrollProtocolData(relativeX, relativeY, width, height, hScroll, vScroll, button);
            this.callback(data);
        };
        const throttledWheel = this.throttle(rawWheelHandler, 50); // 50 мс (достаточно для колёсика)
        videoElement.addEventListener('wheel', throttledWheel);

        videoElement.addEventListener('keydown', async (event) => {
            const androidKeyCode = this.mapToAndroidKeyCode(event);
            if (androidKeyCode !== null) {
                this.snedKeyCode(event, 0, androidKeyCode)
            } else {
                console.log(`key: ${event.code}, not mapped to android key code`);
            }

            if (event.ctrlKey && event.key === 'v') {
                try {
                    const clipboardData = await navigator.clipboard.readText();
                } catch (err) {
                    console.error('Failed to read clipboard contents: ', err);
                }
            }
        });

        videoElement.addEventListener('keyup', async (event) => {
            const androidKeyCode = this.mapToAndroidKeyCode(event);
            if (androidKeyCode !== null) {
                this.snedKeyCode(event, 1, androidKeyCode)
            } else {
                console.log(`key: ${event.code}, not mapped to android key code`);
            }
        });
    }

    resizeScreen(width, height) {
        this.width = width;
        this.height = height;
    }

    mapToAndroidKeyCode(event) {
        const codeToAndroidKeyCode = {
            'KeyA': 29,  'KeyB': 30,  'KeyC': 31,  'KeyD': 32,  'KeyE': 33,
            'KeyF': 34,  'KeyG': 35,  'KeyH': 36,  'KeyI': 37,  'KeyJ': 38,
            'KeyK': 39,  'KeyL': 40,  'KeyM': 41,  'KeyN': 42,  'KeyO': 43,
            'KeyP': 44,  'KeyQ': 45,  'KeyR': 46,  'KeyS': 47,  'KeyT': 48,
            'KeyU': 49,  'KeyV': 50,  'KeyW': 51,  'KeyX': 52,  'KeyY': 53,  'KeyZ': 54,
            'Digit0': 7,   'Digit1': 8,   'Digit2': 9,   'Digit3': 10,  'Digit4': 11,
            'Digit5': 12,  'Digit6': 13,  'Digit7': 14,  'Digit8': 15,  'Digit9': 16,
            'Enter': 66,       'Backspace': 67,   'Tab': 61,         'Space': 62,
            'Escape': 111,     'CapsLock': 115,   'NumLock': 143,    'ScrollLock': 116,
            'ArrowUp': 19,     'ArrowDown': 20,   'ArrowLeft': 21,   'ArrowRight': 22,
            'ShiftLeft': 59,   'ShiftRight': 60,  'ControlLeft': 113,'ControlRight': 114,
            'AltLeft': 57,     'AltRight': 58,    'MetaLeft': 117,   'MetaRight': 118,
            'Numpad0': 144,    'Numpad1': 145,    'Numpad2': 146,    'Numpad3': 147,
            'Numpad4': 148,    'Numpad5': 149,    'Numpad6': 150,    'Numpad7': 151,
            'Numpad8': 152,    'Numpad9': 153,    'NumpadEnter': 160,'NumpadAdd': 157,
            'NumpadSubtract': 156, 'NumpadMultiply': 155, 'NumpadDivide': 154,
            'F1': 131,  'F2': 132,  'F3': 133,  'F4': 134,  'F5': 135,
            'F6': 136,  'F7': 137,  'F8': 138,  'F9': 139,  'F10': 140,
            'F11': 141, 'F12': 142,
            'Back': 4,    'Home': 3,    'Menu': 82,
        };
        return codeToAndroidKeyCode[event.code] !== undefined ? codeToAndroidKeyCode[event.code] : null;
    }

    snedKeyCode(keyevent, action, keycode) {
        const capsLockState = keyevent.getModifierState('CapsLock');
        const numLockState = keyevent.getModifierState('NumLock');
        const scrollLockState = keyevent.getModifierState('ScrollLock');

        let metakey = 0;
        if (keyevent.shiftKey) metakey |= 0x40;
        if (keyevent.ctrlKey) metakey |= 0x2000;
        if (keyevent.altKey) metakey |= 0x10;
        if (keyevent.metaKey) metakey |= 0x20000;
        if (capsLockState) metakey |= 0x100000;
        if (numLockState) metakey |= 0x200000;
        // if (scrollLockState) metakey |= 0x400000;

        let data = this.createKeyProtocolData(action, keycode, keyevent.repeat, metakey);
        this.callback(data);
    }

    createTouchProtocolData(action, x, y, width, height, actionButton, buttons, pressure) {
        const type = 2; // touch event
        const buffer = new ArrayBuffer(1 + 1 + 8 + 4 + 4 + 2 + 2 + 2 + 4 + 4);
        const view = new DataView(buffer);
        let offset = 0;

        view.setUint8(offset, type); offset += 1;
        view.setUint8(offset, action); offset += 1;
        // pointerId (8 байт) – заполняем 0xFFFFFFFFFFFFFFFF (как в оригинале)
        for (let i = 0; i < 8; i++) {
            view.setUint8(offset, 0xff);
            offset += 1;
        }
        view.setInt32(offset, x, false); offset += 4;
        view.setInt32(offset, y, false); offset += 4;
        view.setUint16(offset, width, false); offset += 2;
        view.setUint16(offset, height, false); offset += 2;
        view.setInt16(offset, pressure, false); offset += 2;
        view.setInt32(offset, actionButton, false); offset += 4;
        view.setInt32(offset, buttons, false);

        return buffer;
    }

    createKeyProtocolData(action, keycode, repeat, metaState) {
        const type = 0; // key event
        const buffer = new ArrayBuffer(1 + 1 + 4 + 4 + 4);
        const view = new DataView(buffer);
        let offset = 0;

        view.setUint8(offset, type); offset += 1;
        view.setUint8(offset, action); offset += 1;
        view.setInt32(offset, keycode, false); offset += 4;
        view.setInt32(offset, repeat, false); offset += 4;
        view.setInt32(offset, metaState, false);

        return buffer;
    }

    createScrollProtocolData(x, y, width, height, hScroll, vScroll, button) {
        const type = 3; // scroll event
        const buffer = new ArrayBuffer(1 + 4 + 4 + 2 + 2 + 2 + 2 + 4);
        const view = new DataView(buffer);
        let offset = 0;

        view.setUint8(offset, type); offset += 1;
        view.setInt32(offset, x, false); offset += 4;
        view.setInt32(offset, y, false); offset += 4;
        view.setUint16(offset, width, false); offset += 2;
        view.setUint16(offset, height, false); offset += 2;
        view.setInt16(offset, hScroll, false); offset += 2;
        view.setInt16(offset, vScroll, false); offset += 2;
        view.setInt32(offset, button, false);

        return buffer;
    }

    createScreenProtocolData(action) {
        const type = 4; // Screen off/on event
        const buffer = new ArrayBuffer(1 + 1);
        const view = new DataView(buffer);
        view.setUint8(0, type);
        view.setUint8(1, action);
        return buffer;
    }

    createPowerProtocolData(action) {
        const type = 7; // Screen Power off/on event
        const buffer = new ArrayBuffer(1 + 1);
        const view = new DataView(buffer);
        view.setUint8(0, type);
        view.setUint8(1, action);
        return buffer;
    }

    add_debug_item(text) {
        const p = document.createElement('p');
        p.textContent = text;
        const span = document.createElement('span');
        span.textContent = '0';
        p.appendChild(span);
        document.body.appendChild(p);
        return span;
    }

    screen_on_off(action) {
        let data = this.createScreenProtocolData(action);
        this.callback(data);
    }
}