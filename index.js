(function() {
    'use strict';

    const fieldNode = document.querySelector('.field');
    const state = {
        cursorPosition: null,
        listenerNodePosition: [0, 40, 0],
        listenerOrientation: [0, -1, 0],
        pannerPosition: [0, 0, 0],
        pannerOrientation: [0, 1, 0],
        fieldSize: [fieldNode.offsetWidth, fieldNode.offsetHeight, 0]
    };

    const KEY_W = 87;
    const KEY_S = 83;
    const KEY_A = 65;
    const KEY_D = 68;
    const LISTENER_SPEED = 1.5;

    const fieldDiagonal = Math.sqrt(state.fieldSize.reduce((sum, current) => sum + Math.pow(current, 2)));
    const AUDIO_SPACE_RATE = 1000 < fieldDiagonal ? 1000 / fieldDiagonal : 1;

    const listenerNode = document.createElement('div');
    listenerNode.className = 'object object_listener';
    const listenerBodyNode = document.createElement('div');
    listenerBodyNode.className = 'object-body';
    listenerNode.appendChild(listenerBodyNode);

    const pannerNode = document.createElement('div');
    pannerNode.className = 'object object_panner';
    const pannerBodyNode = document.createElement('div');
    pannerBodyNode.className = 'object-body';
    const pannerConeInnerNode = document.createElement('div');
    pannerConeInnerNode.className = 'object-body-cone object-body-cone_inner';
    pannerBodyNode.appendChild(pannerConeInnerNode);
    const pannerConeOuterNode = document.createElement('div');
    pannerConeOuterNode.className = 'object-body-cone object-body-cone_outer';
    pannerBodyNode.appendChild(pannerConeOuterNode);
    pannerNode.appendChild(pannerBodyNode);

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    const audioSource = audioCtx.createBufferSource();
    const listener = audioCtx.listener;
    const panner = audioCtx.createPanner();
    const gain = audioCtx.createGain();
    panner.distanceModel = 'exponential';
    panner.panningModel = 'HRTF';
    panner.refDistance = 10;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 90;
    panner.coneOuterAngle = 160;
    panner.coneOuterGain = 0.1;

    const keyPressed = {
        [KEY_W]: false,
        [KEY_S]: false,
        [KEY_A]: false,
        [KEY_D]: false
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
            fieldNode.appendChild(pannerNode);
            fieldNode.appendChild(listenerNode);
            audioSource.start(0);
        });

    const formNode = document.controls;
    formNode['panner-x'].min = -Math.floor(state.fieldSize[0] / 2);
    formNode['panner-x'].max = Math.floor(state.fieldSize[0] / 2);
    formNode['panner-x'].value = state.pannerPosition[0];
    formNode['panner-y'].min = -Math.floor(state.fieldSize[1] / 2);
    formNode['panner-y'].max = Math.floor(state.fieldSize[1] / 2);
    formNode['panner-y'].value = state.pannerPosition[1];
    formNode['panner-z'].min = formNode['panner-z'].max = formNode['panner-z'].value = state.pannerPosition[2];
    formNode['panner-angle'].value = getAngleFromVector(state.pannerOrientation);
    formNode['panner-cone-inner'].value = panner.coneInnerAngle;
    formNode['panner-cone-outer'].value = panner.coneOuterAngle;
    formNode['panner-cone-gain'].value = panner.coneOuterGain;
    formNode.addEventListener('input', event => {
        switch (e.target.name) {
            case 'panner-x':
                state.pannerPosition[0] = event.target.valueAsNumber;
                break;
            case 'panner-y':
                state.pannerPosition[1] = event.target.valueAsNumber;
                break;
            case 'panner-z':
                state.pannerPosition[2] = event.target.valueAsNumber;
                break;
            case 'panner-angle':
                state.pannerOrientation = getVectorFromAngle(event.target.valueAsNumber);
                break;
            case 'panner-cone-inner':
                panner.coneInnerAngle = event.target.valueAsNumber;
                break;
            case 'panner-cone-outer':
                panner.coneOuterAngle = event.target.valueAsNumber;
                break;
            case 'panner-cone-gain':
                panner.coneOuterGain = event.target.valueAsNumber;
                break;
        }
    });
    formNode.mute.addEventListener('change', event => {
        if (event.target.checked) {
            gain.gain.value = 1;
        } else {
            gain.gain.value = 0;
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

    function render() {
        window.requestAnimationFrame(render);

        // updating position
        if (keyPressed[KEY_W]) {
            if (keyPressed[KEY_A]) {
                state.listenerNodePosition[0] -= LISTENER_SPEED * 1.14;
                state.listenerNodePosition[1] -= LISTENER_SPEED * 1.14;
            } else if (keyPressed[KEY_D]) {
                state.listenerNodePosition[0] += LISTENER_SPEED * 1.14;
                state.listenerNodePosition[1] -= LISTENER_SPEED * 1.14;
            } else {
                state.listenerNodePosition[1] -= LISTENER_SPEED;
            }
        } else if (keyPressed[KEY_S]) {
            if (keyPressed[KEY_A]) {
                state.listenerNodePosition[0] -= LISTENER_SPEED * 1.14;
                state.listenerNodePosition[1] += LISTENER_SPEED * 1.14;
            } else if (keyPressed[KEY_D]) {
                state.listenerNodePosition[0] += LISTENER_SPEED * 1.14;
                state.listenerNodePosition[1] += LISTENER_SPEED * 1.14;
            } else {
                state.listenerNodePosition[1] += LISTENER_SPEED;
            }
        } else if (keyPressed[KEY_A]) {
            state.listenerNodePosition[0] -= LISTENER_SPEED;
        } else if (keyPressed[KEY_D]) {
            state.listenerNodePosition[0] += LISTENER_SPEED;
        }
        for (let i = 0; i < 2; i++) {
            state.listenerNodePosition[i] = Math.min(Math.max(state.listenerNodePosition[i], -state.fieldSize[i] / 2), state.fieldSize[i] / 2);
        }

        // updating orientation
        if (state.cursorPosition) {
            state.listenerOrientation = [
                state.cursorPosition[0] - state.listenerNodePosition[0],
                state.cursorPosition[1] - state.listenerNodePosition[1],
                state.listenerOrientation[2]
            ];
        }

        listenerNode.style.transform = getTransformValue({ position: state.listenerNodePosition });
        listenerBodyNode.style.transform = getTransformValue({
            angle: getAngleFromVector(state.listenerOrientation)
        });

        listener.setOrientation(...state.listenerOrientation, 0, 0, -1);
        const listenerPosition = [
            AUDIO_SPACE_RATE * state.listenerNodePosition[0],
            AUDIO_SPACE_RATE * state.listenerNodePosition[1],
            AUDIO_SPACE_RATE * state.listenerNodePosition[2]
        ];
        setPosition(listener, ...listenerPosition);

        // linear volume gain
        // const volumeDistanceGainCoeff = 1 -
        //     panner.rolloffFactor * (getDistance(listenerPosition, state.pannerPosition) - panner.refDistance) /
        //     (panner.maxDistance - panner.refDistance);

        // inverse volume gain
        // const volumeDistanceGainCoeff = panner.refDistance /
        //     (panner.refDistance + panner.rolloffFactor * (getDistance(listenerPosition, state.pannerPosition) - panner.refDistance));

        // exponential volume gain
        const volumeDistanceGainCoeff = Math.pow(
            Math.max(getDistance(listenerPosition, state.pannerPosition), panner.refDistance) / panner.refDistance,
            -panner.rolloffFactor
        );
        formNode['listener-x'].value = Math.round(listenerPosition[0]);
        formNode['listener-y'].value = Math.round(listenerPosition[1]);
        formNode['listener-z'].value = Math.round(listenerPosition[2]);
        formNode['listener-angle'].value = Math.round(getAngleFromVector(state.listenerOrientation));
        formNode['panner-distance-gain'].value = volumeDistanceGainCoeff;
        formNode['panner-cone-volume-gain'].value = getConeGain(listenerPosition, panner, state.pannerPosition, state.pannerOrientation);
        formNode['panner-volume-gain'].value = formNode['panner-distance-gain'].valueAsNumber *
            formNode['panner-cone-volume-gain'].valueAsNumber;

        panner.setOrientation(...state.pannerOrientation);
        pannerConeInnerNode.style.setProperty('--cone-angle-left', `-${panner.coneInnerAngle / 2}deg`, '');
        pannerConeInnerNode.style.setProperty('--cone-angle-right', `${panner.coneInnerAngle / 2}deg`, '');
        pannerConeOuterNode.style.setProperty('--cone-angle-left', `-${panner.coneOuterAngle / 2}deg`, '');
        pannerConeOuterNode.style.setProperty('--cone-angle-right', `${panner.coneOuterAngle / 2}deg`, '');
        setPosition(panner, ...state.pannerPosition);

        pannerNode.style.transform = getTransformValue({ position: state.pannerPosition });
        pannerBodyNode.style.transform = getTransformValue({
            angle: getAngleFromVector(state.pannerOrientation)
        });
    }

    function getTransformValue({ position, angle }) {
        return `${position ? `translate(${position[0]}px, ${position[1]}px)` : ``} ${ angle ? `rotateZ(${angle}deg)` : `` }`.trim();
    }

    function getDistance(v1, v2) {
        return Math.sqrt(Math.pow(v1[0] - v2[0], 2) + Math.pow(v1[1] - v2[1], 2));
    }

    function setPosition(obj, x, y, z) {
        if (obj.setPosition) {
            obj.setPosition(x, y, z);
        } else {
            obj.positionX.value = x;
            obj.positionY.value = y;
            obj.positionZ.value = z;
        }
    }

    function getAngleFromVector(v) {
        return (v[0] < 0 ? 180 : 0) + 180 * Math.atan(v[1] / v[0]) / Math.PI;
    }

    function getVectorFromAngle(angle) {
        angle = angle * Math.PI / 180;
        return [Math.cos(angle), Math.sin(angle), 0];
    }

    function getConeGain(listenerPosition, panner, pannerPosition, pannerOrientation) {
        const pannerAngle = getAngleFromVector(pannerOrientation);
        let listenerRelativeAngle = getAngleFromVector([
            listenerPosition[0] - pannerPosition[0],
            listenerPosition[1] - pannerPosition[1]
        ]) - pannerAngle;
        if (listenerRelativeAngle > 180) {
            listenerRelativeAngle = 360 - listenerRelativeAngle;
        } else if (listenerRelativeAngle < -180) {
            listenerRelativeAngle = 360 + listenerRelativeAngle;
        }
        listenerRelativeAngle = Math.abs(listenerRelativeAngle);
        if (listenerRelativeAngle < panner.coneInnerAngle / 2) {
            return 1;
        } else if (listenerRelativeAngle > panner.coneOuterAngle / 2) {
            return panner.coneOuterGain;
        } else {
            return 1 - (1 - panner.coneOuterGain) *
                (2 * listenerRelativeAngle - panner.coneInnerAngle) / (panner.coneOuterAngle - panner.coneInnerAngle);
        }
    }
})();
