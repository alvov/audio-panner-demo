(function() {
    'use strict';

    let clickToPlayMessageNode = document.querySelector('.click-to-play-message');
    const fieldNode = document.querySelector('.field');
    const listenerNode = document.querySelector('.object_listener');
    const pannerNode = document.querySelector('.object_panner');
    const pannerInstanceNode = pannerNode.querySelector('.object-instance');

    const soundStates = {
        LOADING: 'LOADING',
        FAILED: 'FAILED',
        PLAYING: 'PLAYING',
        STOPPED: 'STOPPED'
    };

    const state = {
        cursorPosition: null,
        fieldSize: [fieldNode.offsetWidth, fieldNode.offsetHeight, 0],
        listener: {
            position: [0, -40, 0],
            forward: [0, 1, 0],
            up: [0, 0, 1]
        },
        panner: {
            position: [0, 0, 0],
            orientation: [0, -1, 0],
            panningModel: 'HRTF',
            distanceModel: 'exponential',
            maxDistance: 300,
            refDistance: 20,
            rolloffFactor: 1,
            coneInnerAngle: 90,
            coneOuterAngle: 160,
            coneOuterGain: 0.1
        },
        sound: soundStates.LOADING
    };
    updateFieldSize();

    const soundFormats = new Map();
    soundFormats.set('audio/aac', 'panner.m4a');
    soundFormats.set('audio/ogg', 'panner.ogg');

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
    const listener = audioCtx.listener;
    const panner = audioCtx.createPanner();
    panner.connect(audioCtx.destination);
    let audioSource;

    const soundPromise = Promise.resolve()
        .then(() => {
            const tempAudioNode = document.createElement('audio');
            for (let [type, file] of soundFormats) {
                if (tempAudioNode.canPlayType(type) !== '') {
                    return fetch(file)
                        .then(response => response.arrayBuffer())
                        .then(buffer => {
                            return new Promise((resolveDecoding, rejectDecoding) => {
                                audioCtx.decodeAudioData(buffer, function(decodedData) {
                                    resolveDecoding(decodedData);
                                }, rejectDecoding);
                            });
                        });
                }
            }
            return Promise.reject(`Provided file types ${Array.from(soundFormats.keys())} are not supported`);
        })
        .then(decodedData => {
            state.sound = soundStates.STOPPED;
            return decodedData;
        })
        .catch(error => {
            state.sound = soundStates.FAILED;
            alert('Something went wrong while decoding audio in your browser, sorry ' + error);
            if (error) {
                console.error(error);
            }
            return Promise.reject();
        });

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

    const formNode = document.controls;
    formNode['panner-positionX'].min = -Math.floor(state.fieldSize[0] / 2);
    formNode['panner-positionX'].max = Math.floor(state.fieldSize[0] / 2);
    formNode['panner-positionX'].value = state.panner.position[0];
    formNode['panner-positionY'].min = -Math.floor(state.fieldSize[1] / 2);
    formNode['panner-positionY'].max = Math.floor(state.fieldSize[1] / 2);
    formNode['panner-positionY'].value = state.panner.position[1];
    formNode['panner-positionZ'].min =
    formNode['panner-positionZ'].max =
    formNode['panner-positionZ'].value = state.panner.position[2];
    formNode['panner-angle'].value = getAngleFromVector(state.panner.orientation);
    formNode['panner-coneInnerAngle'].value = state.panner.coneInnerAngle;
    formNode['panner-coneOuterAngle'].value = state.panner.coneOuterAngle;
    formNode['panner-coneOuterGain'].value = state.panner.coneOuterGain;
    formNode['panner-panningModel'].value = state.panner.panningModel;
    formNode['panner-distanceModel'].value = state.panner.distanceModel;
    formNode['panner-maxDistance'].value = state.panner.maxDistance;
    formNode['panner-refDistance'].value = state.panner.refDistance;
    formNode['panner-rolloffFactor'].value = state.panner.rolloffFactor;
    formNode.addEventListener('input', event => {
        switch (event.target.name) {
            case 'panner-positionX':
                state.panner.position[0] = event.target.valueAsNumber;
                break;
            case 'panner-positionY':
                state.panner.position[1] = event.target.valueAsNumber;
                break;
            case 'panner-positionZ':
                state.panner.position[2] = event.target.valueAsNumber;
                break;
            case 'panner-angle':
                state.panner.orientation = getVectorFromAngle(event.target.valueAsNumber);
                break;
            case 'panner-coneInnerAngle':
                state.panner.coneInnerAngle = event.target.valueAsNumber;
                break;
            case 'panner-coneOuterAngle':
                state.panner.coneOuterAngle = event.target.valueAsNumber;
                break;
            case 'panner-coneOuterGain':
                state.panner.coneOuterGain = event.target.valueAsNumber;
                break;
            case 'panner-maxDistance':
                state.panner.maxDistance = event.target.valueAsNumber;
                break;
            case 'panner-refDistance':
                state.panner.refDistance = event.target.valueAsNumber;
                break;
            case 'panner-rolloffFactor':
                state.panner.rolloffFactor = event.target.valueAsNumber;
                break;
        }
    });
    formNode.addEventListener('change', event => {
        switch (event.target.name) {
            case 'mute':
                togglePlay();
                break;
            case 'panner-panningModel':
                state.panner.panningModel = event.target.value;
                break;
            case 'panner-distanceModel':
                state.panner.distanceModel = event.target.value;
                break;
        }
    });

    pannerInstanceNode.addEventListener('click', togglePlay);

    clickToPlayMessageNode.addEventListener('click', togglePlay);

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
        state.cursorPosition = getCursorPosition(event);
    });
    document.addEventListener('touchend', event => {
        const touch = event.touches[0] || event.changedTouches[0];
        state.cursorPosition = getCursorPosition(touch);
    });
    window.addEventListener('resize', () => {
        state.fieldSize = [fieldNode.offsetWidth, fieldNode.offsetHeight, 0];
    });

    render();
    pannerNode.classList.remove(CLASS_HIDDEN);
    listenerNode.classList.remove(CLASS_HIDDEN);

    /**
     * Toggles the sound playing on and off
     */
    function togglePlay() {
        if (state.sound !== soundStates.FAILED) {
            if (clickToPlayMessageNode) {
                clickToPlayMessageNode.remove();
                clickToPlayMessageNode = null;
            }
            soundPromise
                .then(decodedData => {
                    if (state.sound === soundStates.STOPPED) {
                        state.sound = soundStates.PLAYING;
                        audioSource = createAudioSource(decodedData);
                        audioSource.start(0);
                    } else if (state.sound === soundStates.PLAYING) {
                        state.sound = soundStates.STOPPED;
                        audioSource.stop();
                        audioSource.disconnect(panner);
                    }
                })
                .catch(() => {
                    pannerInstanceNode.removeEventListener('click', togglePlay);
                    formNode['mute'].remove();
                })
        }
    }

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
            state.listener.forward = [
                state.cursorPosition[0] - state.listener.position[0],
                -state.cursorPosition[1] - state.listener.position[1],
                state.listener.forward[2]
            ];
        }
        setListenerOrientation(...state.listener.forward, ...state.listener.up);

        listenerNode.style.transform = getTransformValue({
            position: [state.listener.position[0], -state.listener.position[1]],
            angle: getAngleFromVector(state.listener.forward)
        });

        // panner
        panner.panningModel = state.panner.panningModel;
        panner.distanceModel = state.panner.distanceModel;
        panner.maxDistance = state.panner.maxDistance;
        panner.refDistance = state.panner.refDistance;
        panner.rolloffFactor = state.panner.rolloffFactor;
        panner.coneInnerAngle = state.panner.coneInnerAngle;
        panner.coneOuterAngle = state.panner.coneOuterAngle;
        panner.coneOuterGain = state.panner.coneOuterGain;

        setPannerOrientation(...state.panner.orientation);
        setPosition(panner, ...state.panner.position);

        pannerNode.classList.toggle('object_loading', state.sound === soundStates.LOADING);
        pannerNode.classList.toggle('object_active', state.sound === soundStates.PLAYING);
        pannerNode.style.transform = getTransformValue({
            position: [state.panner.position[0], -state.panner.position[1]],
            angle: getAngleFromVector(state.panner.orientation)
        });
        pannerNode.style.setProperty('--cone-angle-inner', `${state.panner.coneInnerAngle / 2}deg`, '');
        pannerNode.style.setProperty('--cone-angle-outer', `${state.panner.coneOuterAngle / 2}deg`, '');
        pannerNode.style.setProperty('--cone-length', `${state.fieldDiagonal}px`, '');
        pannerNode.style.setProperty('--ref-distance', `${state.panner.refDistance}px`, '');
        pannerNode.style.setProperty('--max-distance', `${state.panner.distanceModel === 'linear' ? state.panner.maxDistance : 0}px`, '');

        // form fields
        formNode['mute'].checked = state.sound === soundStates.PLAYING;
        formNode['listener-positionX'].value = Math.round(state.listener.position[0]);
        formNode['listener-positionY'].value = Math.round(state.listener.position[1]);
        formNode['listener-positionZ'].value = Math.round(state.listener.position[2]);
        const normalizedListenerForward = normalize(state.listener.forward);
        formNode['listener-forwardX'].value = normalizedListenerForward[0];
        formNode['listener-forwardY'].value = normalizedListenerForward[1];
        formNode['listener-forwardZ'].value = normalizedListenerForward[2];
        const normalizedListenerUp = normalize(state.listener.up);
        formNode['listener-upX'].value = normalizedListenerUp[0];
        formNode['listener-upY'].value = normalizedListenerUp[1];
        formNode['listener-upZ'].value = normalizedListenerUp[2];
        formNode['listener-angleForward'].value = Math.round(getAngleFromVector(state.listener.forward));

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
        formNode['volume-distanceGain'].value = volumeDistanceGainCoeff;
        const volumeConeGainCoeff = getConeGain();
        formNode['volume-coneGain'].value = volumeConeGainCoeff;
        formNode['volume-totalVolumeGain'].value = volumeDistanceGainCoeff * volumeConeGainCoeff;

        const normalizedPannerOrientation = normalize(state.panner.orientation);
        formNode['panner-orientationX'].value = normalizedPannerOrientation[0];
        formNode['panner-orientationY'].value = normalizedPannerOrientation[1];
        formNode['panner-orientationZ'].value = normalizedPannerOrientation[2];
        if (state.panner.distanceModel === 'linear') {
            formNode['panner-maxDistance'].removeAttribute('readonly');
        } else {
            formNode['panner-maxDistance'].setAttribute('readonly', 'readonly');
        }
    }

    /**
     * Returns new AudioBufferSourceNode instance for given buffer
     * @param {Object} decodedData
     * @returns {Object}
     */
    function createAudioSource(decodedData) {
        const audioSource = audioCtx.createBufferSource();
        audioSource.loop = true;
        audioSource.connect(panner);
        audioSource.buffer = decodedData;
        return audioSource;
    }

    /**
     * Returns cursor position
     * @param {Object} event
     * @returns {number[]}
     */
    function getCursorPosition(event) {
        return [
            event.clientX - fieldNode.offsetLeft - state.fieldSize[0] / 2,
            event.clientY - fieldNode.offsetTop - state.fieldSize[1] / 2
        ];
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
     * Returns normalized 3d-vector
     * @param {number[]} v
     * @returns {number[]}
     */
    function normalize(v) {
        const sum = Math.sqrt(v.reduce((result, axisValue) => result + Math.pow(axisValue, 2), 0));
        return v.map(axisValue => axisValue / sum);
    }

    /**
     * Sets the panner/listener position
     * @param {Object} obj
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    function setPosition(obj, x, y, z) {
        if (obj.positionX) {
            obj.positionX.value = x;
            obj.positionY.value = y;
            obj.positionZ.value = z;
        } else {
            obj.setPosition(x, y, z);
        }
    }

    /**
     * Sets listener orientation with fallback to older API
     * @param {number} forwardX
     * @param {number} forwardY
     * @param {number} forwardZ
     * @param {number} upX
     * @param {number} upY
     * @param {number} upZ
     */
    function setListenerOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ) {
        if (listener.forwardX) {
            listener.forwardX.value = forwardX;
            listener.forwardY.value = forwardY;
            listener.forwardZ.value = forwardZ;
            listener.upX.value = upX;
            listener.upY.value = upY;
            listener.upZ.value = upZ;
        } else {
            listener.setOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ);
        }
    }

    /**
     * Sets panner orientation with fallback to older API
     * @param {number} orientationX
     * @param {number} orientationY
     * @param {number} orientationZ
     */
    function setPannerOrientation(orientationX, orientationY, orientationZ) {
        if (panner.orientationX) {
            panner.orientationX.value = orientationX;
            panner.orientationY.value = orientationY;
            panner.orientationZ.value = orientationZ;
        } else {
            panner.setOrientation(orientationX, orientationY, orientationZ);
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
