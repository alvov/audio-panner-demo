(function() {
    'use strict';

    const loadingScreenNode = document.querySelector('.loading');
    const fieldNode = document.querySelector('.field');
    const listenerNode = document.querySelector('.object_listener');
    const pannerNode = document.querySelector('.object_panner');

    const state = {
        cursorPosition: null,
        fieldSize: [fieldNode.offsetWidth, fieldNode.offsetHeight, 0],
        listener: {
            position: [0, -40, 0],
            orientation: [0, 1, 0]
        },
        panner: {
            position: [0, 0, 0],
            orientation: [0, -1, 0],
            panningModel: 'HRTF',
            distanceModel: 'exponential',
            maxDistance: 500,
            refDistance: 20,
            rolloffFactor: 1,
            coneInnerAngle: 90,
            coneOuterAngle: 160,
            coneOuterGain: 0.1
        },
        gain: {
            value: 1
        }
    };
    updateFieldSize();

    const KEY_W = 87;
    const KEY_S = 83;
    const KEY_A = 65;
    const KEY_D = 68;
    const KEY_UP = 38;
    const KEY_DOWN = 40;
    const KEY_LEFT = 37;
    const KEY_RIGHT = 39;

    const CLASS_HIDDEN = 'hidden';

    const SQUARE_OF_2 = 1.14;
    const LISTENER_SPEED = 1.5;
    const LISTENER_DIAGONAL_SPEED = LISTENER_SPEED / SQUARE_OF_2;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    const audioSource = audioCtx.createBufferSource();
    const listener = audioCtx.listener;
    const panner = audioCtx.createPanner();
    const gain = audioCtx.createGain();

    const keyPressed = {
        [KEY_W]: false,
        [KEY_S]: false,
        [KEY_A]: false,
        [KEY_D]: false,
        [KEY_UP]: false,
        [KEY_DOWN]: false,
        [KEY_LEFT]: false,
        [KEY_RIGHT]: false
    };

    fetch('0948.ogg')
        .then(response => response.arrayBuffer())
        .then(buffer => {
            return new Promise((resolve, reject) => {
                audioCtx.decodeAudioData(buffer, function(decodedData) {
                    audioSource.buffer = decodedData;
                    audioSource.connect(gain);
                    gain.connect(panner);
                    panner.connect(audioCtx.destination);
                    audioSource.loop = true;
                    resolve();
                }, reject);
            });
        })
        .catch(error => {
            alert('Something didn\'t work in your browser, sorry');
            console.error(error);
        })
        .then(() => {
            render();
            pannerNode.classList.remove(CLASS_HIDDEN);
            listenerNode.classList.remove(CLASS_HIDDEN);
            loadingScreenNode.remove();
            audioSource.start(0);
        });

    const formNode = document.controls;
    formNode['mute'].checked = state.gain.value;
    formNode['panner-x'].min = -Math.floor(state.fieldSize[0] / 2);
    formNode['panner-x'].max = Math.floor(state.fieldSize[0] / 2);
    formNode['panner-x'].value = state.panner.position[0];
    formNode['panner-y'].min = -Math.floor(state.fieldSize[1] / 2);
    formNode['panner-y'].max = Math.floor(state.fieldSize[1] / 2);
    formNode['panner-y'].value = state.panner.position[1];
    formNode['panner-z'].min = formNode['panner-z'].max = formNode['panner-z'].value = state.panner.position[2];
    formNode['panner-angle'].value = getAngleFromVector(state.panner.orientation);
    formNode['panner-cone-inner'].value = state.panner.coneInnerAngle;
    formNode['panner-cone-outer'].value = state.panner.coneOuterAngle;
    formNode['panner-cone-gain'].value = state.panner.coneOuterGain;
    formNode['panner-model'].value = state.panner.panningModel;
    formNode['panner-distance-model'].value = state.panner.distanceModel;
    formNode['panner-max-distance'].value = state.panner.maxDistance;
    formNode['panner-ref-distance'].value = state.panner.refDistance;
    formNode['panner-rolloff-factor'].value = state.panner.rolloffFactor;
    formNode.addEventListener('input', event => {
        switch (event.target.name) {
            case 'panner-x':
                state.panner.position[0] = event.target.valueAsNumber;
                break;
            case 'panner-y':
                state.panner.position[1] = event.target.valueAsNumber;
                break;
            case 'panner-z':
                state.panner.position[2] = event.target.valueAsNumber;
                break;
            case 'panner-angle':
                state.panner.orientation = getVectorFromAngle(event.target.valueAsNumber);
                break;
            case 'panner-cone-inner':
                state.panner.coneInnerAngle = event.target.valueAsNumber;
                break;
            case 'panner-cone-outer':
                state.panner.coneOuterAngle = event.target.valueAsNumber;
                break;
            case 'panner-cone-gain':
                state.panner.coneOuterGain = event.target.valueAsNumber;
                break;
            case 'panner-max-distance':
                state.panner.maxDistance = event.target.valueAsNumber;
                break;
            case 'panner-ref-distance':
                state.panner.refDistance = event.target.valueAsNumber;
                break;
            case 'panner-rolloff-factor':
                state.panner.rolloffFactor = event.target.valueAsNumber;
                break;
        }
    });
    formNode.addEventListener('change', event => {
        switch (event.target.name) {
            case 'mute':
                if (event.target.checked) {
                    state.gain.value = 1;
                } else {
                    state.gain.value = 0;
                }
                break;
            case 'panner-model':
                state.panner.panningModel = event.target.value;
                break;
            case 'panner-distance-model':
                state.panner.distanceModel = event.target.value;
                break;
        }
    });

    document.addEventListener('keydown', event => {
        if (event.keyCode in keyPressed) {
            keyPressed[event.keyCode] = true;
        }
    });
    document.addEventListener('keyup', event => {
        if (event.keyCode in keyPressed) {
            keyPressed[event.keyCode] = false;
        }
    });
    document.addEventListener('mousemove', event => {
        state.cursorPosition = [
            event.clientX - fieldNode.offsetLeft - state.fieldSize[0] / 2,
            event.clientY - fieldNode.offsetTop - state.fieldSize[1] / 2
        ];
    });
    window.addEventListener('resize', () => {
        state.fieldSize = [fieldNode.offsetWidth, fieldNode.offsetHeight, 0];
    });

    /**
     * Does the whole rendering in a loop
     */
    function render() {
        window.requestAnimationFrame(render);

        // listener
        if (keyPressed[KEY_W] || keyPressed[KEY_UP]) {
            if (keyPressed[KEY_A] || keyPressed[KEY_LEFT]) {
                state.listener.position[0] -= LISTENER_DIAGONAL_SPEED;
                state.listener.position[1] += LISTENER_DIAGONAL_SPEED;
            } else if (keyPressed[KEY_D] || keyPressed[KEY_RIGHT]) {
                state.listener.position[0] += LISTENER_DIAGONAL_SPEED;
                state.listener.position[1] += LISTENER_DIAGONAL_SPEED;
            } else {
                state.listener.position[1] += LISTENER_SPEED;
            }
        } else if (keyPressed[KEY_S] || keyPressed[KEY_DOWN]) {
            if (keyPressed[KEY_A] || keyPressed[KEY_LEFT]) {
                state.listener.position[0] -= LISTENER_DIAGONAL_SPEED;
                state.listener.position[1] -= LISTENER_DIAGONAL_SPEED;
            } else if (keyPressed[KEY_D] || keyPressed[KEY_RIGHT]) {
                state.listener.position[0] += LISTENER_DIAGONAL_SPEED;
                state.listener.position[1] -= LISTENER_DIAGONAL_SPEED;
            } else {
                state.listener.position[1] -= LISTENER_SPEED;
            }
        } else if (keyPressed[KEY_A] || keyPressed[KEY_LEFT]) {
            state.listener.position[0] -= LISTENER_SPEED;
        } else if (keyPressed[KEY_D] || keyPressed[KEY_RIGHT]) {
            state.listener.position[0] += LISTENER_SPEED;
        }
        for (let i = 0; i < 2; i++) {
            state.listener.position[i] = Math.min(
                Math.max(state.listener.position[i], -state.fieldSize[i] / 2),
                state.fieldSize[i] / 2
            );
        }
        setPosition(listener, ...state.listener.position);

        // orientation
        if (state.cursorPosition) {
            state.listener.orientation = [
                state.cursorPosition[0] - state.listener.position[0],
                -state.cursorPosition[1] - state.listener.position[1],
                state.listener.orientation[2]
            ];
        }

        listener.setOrientation(...state.listener.orientation, 0, 0, 1);

        listenerNode.style.transform = getTransformValue({
            position: [state.listener.position[0], -state.listener.position[1]],
            angle: getAngleFromVector(state.listener.orientation)
        });

        // gain
        gain.gain.value = state.gain.value;

        // form fields
        formNode['listener-x'].value = Math.round(state.listener.position[0]);
        formNode['listener-y'].value = Math.round(state.listener.position[1]);
        formNode['listener-z'].value = Math.round(state.listener.position[2]);
        formNode['listener-angle'].value = Math.round(getAngleFromVector(state.listener.orientation));

        let volumeDistanceGainCoeff;
        switch (state.panner.distanceModel) {
            case 'linear':
                volumeDistanceGainCoeff = volumeGainLinear();
                break;
            case 'inverse':
                volumeDistanceGainCoeff = volumeGainInverse();
                break;
            case 'exponential':
                volumeDistanceGainCoeff = volumeGainExponential();
                break;
        }
        formNode['panner-distance-gain'].value = volumeDistanceGainCoeff;

        const volumeConeGainCoeff = getConeGain();
        formNode['panner-cone-volume-gain'].value = volumeConeGainCoeff;
        formNode['panner-volume-gain'].value = volumeDistanceGainCoeff * volumeConeGainCoeff;

        if (state.panner.distanceModel === 'linear') {
            formNode['panner-max-distance'].removeAttribute('readonly');
        } else {
            formNode['panner-max-distance'].setAttribute('readonly', 'readonly');
        }

        // panner
        panner.panningModel = state.panner.panningModel;
        panner.distanceModel = state.panner.distanceModel;
        panner.maxDistance = state.panner.maxDistance;
        panner.refDistance = state.panner.refDistance;
        panner.rolloffFactor = state.panner.rolloffFactor;
        panner.coneInnerAngle = state.panner.coneInnerAngle;
        panner.coneOuterAngle = state.panner.coneOuterAngle;
        panner.coneOuterGain = state.panner.coneOuterGain;

        panner.setOrientation(...state.panner.orientation);
        setPosition(panner, ...state.panner.position);

        pannerNode.style.transform = getTransformValue({
            position: [state.panner.position[0], -state.panner.position[1]],
            angle: getAngleFromVector(state.panner.orientation)
        });
        pannerNode.style.setProperty('--cone-angle-inner', `${state.panner.coneInnerAngle / 2}deg`, '');
        pannerNode.style.setProperty('--cone-angle-outer', `${state.panner.coneOuterAngle / 2}deg`, '');
        pannerNode.style.setProperty('--cone-length', `${state.fieldDiagonal}px`, '');
        pannerNode.style.setProperty('--ref-distance', `${state.panner.refDistance}px`, '');
    }

    /**
     * Returns value form `transform` property for given position and angle
     * @param {number[]} position
     * @param {number} angle
     * @returns {string}
     */
    function getTransformValue({ position, angle }) {
        return `${position ? `translate(${position[0]}px, ${position[1]}px)` : ``} ${ angle ? `rotateZ(${angle}deg)` : `` }`.trim();
    }

    /**
     * Returns the distance between two points
     * @param {number[]} p1
     * @param {number[]} p2
     * @returns {number}
     */
    function getDistance(p1, p2) {
        return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
    }

    /**
     * Sets the panner/listener position
     * @param {Object} obj
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    function setPosition(obj, x, y, z) {
        if (obj.setPosition) {
            obj.setPosition(x, y, z);
        } else {
            obj.positionX.value = x;
            obj.positionY.value = y;
            obj.positionZ.value = z;
        }
    }

    /**
     * Returns the angle in degrees for the correspondent vector
     * It changes the sign of the angle value, because css coordinate system is mirrored relative to panner's
     * coordinate system
     * @param {number[]} v
     * @returns {number}
     */
    function getAngleFromVector(v) {
        return -((v[0] < 0 ? 180 : 0) + 180 * Math.atan(v[1] / v[0]) / Math.PI);
    }

    /**
     * Returns a normalized vector for the correspondent angle in degrees
     * @param {number} angle
     * @returns {number[]}
     */
    function getVectorFromAngle(angle) {
        angle = angle * Math.PI / 180;
        return [Math.cos(angle), Math.sin(angle), 0];
    }

    /**
     * Returns the value of volume gain for linear function
     * @returns {number}
     */
    function volumeGainLinear() {
        return 1 -
            state.panner.rolloffFactor *
            (
                Math.max(
                    Math.min(
                        getDistance(state.listener.position, state.panner.position),
                        state.panner.maxDistance
                    ),
                    state.panner.refDistance
                ) - state.panner.refDistance
            ) /
            (state.panner.maxDistance - state.panner.refDistance);
    }

    /**
     * Returns the value of volume gain for inverse function
     * @returns {number}
     */
    function volumeGainInverse() {
        return state.panner.refDistance /
            (
                state.panner.refDistance +
                state.panner.rolloffFactor *
                (
                    Math.max(getDistance(state.listener.position, state.panner.position), state.panner.refDistance) -
                    state.panner.refDistance
                )
            );
    }

    /**
     * Returns the value of volume gain for exponential function
     * @returns {number}
     */
    function volumeGainExponential() {
        return Math.pow(
            Math.max(
                getDistance(state.listener.position, state.panner.position),
                state.panner.refDistance
            ) / state.panner.refDistance,
            -state.panner.rolloffFactor
        );
    }

    /**
     * Returns the value of volume gain computed for panner's inner and outer cones
     * @returns {number}
     */
    function getConeGain() {
        const pannerAngle = getAngleFromVector(state.panner.orientation);
        let listenerRelativeAngle = getAngleFromVector([
            state.listener.position[0] - state.panner.position[0],
            state.listener.position[1] - state.panner.position[1]
        ]) - pannerAngle;
        if (listenerRelativeAngle > 180) {
            listenerRelativeAngle = 360 - listenerRelativeAngle;
        } else if (listenerRelativeAngle < -180) {
            listenerRelativeAngle = 360 + listenerRelativeAngle;
        }
        listenerRelativeAngle = Math.abs(listenerRelativeAngle);
        if (listenerRelativeAngle < state.panner.coneInnerAngle / 2) {
            return 1;
        } else if (listenerRelativeAngle > state.panner.coneOuterAngle / 2) {
            return state.panner.coneOuterGain;
        } else {
            return 1 - (1 - state.panner.coneOuterGain) *
                (2 * listenerRelativeAngle - state.panner.coneInnerAngle) / (state.panner.coneOuterAngle - state.panner.coneInnerAngle);
        }
    }

    /**
     * Fills the state with actual field sizes
     */
    function updateFieldSize() {
        state.fieldSize = [fieldNode.offsetWidth, fieldNode.offsetHeight, 0];
        state.fieldDiagonal = Math.sqrt(state.fieldSize.reduce((sum, current) => sum + Math.pow(current, 2), 0));
    }
})();
