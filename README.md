#Audio panner demo

Use `[W, A, S, D]` or arrow keys to move the listener (white circle)
around the panner sound source (red circle).
 
Use mouse/touchpad to change listener's orientation,
indicated by the arrow inside the white circle.

Use input fields to change the orientation and
position of the sound source.

_This demo uses the sound from [www.bigsoundbank.com](http://www.bigsoundbank.com/sound-0948-tractor-and-shredder.html)._

#По-русски (in Russian)

Интерфейс [`PannerNode`](https://webaudio.github.io/web-audio-api/#the-pannernode-interface) — часть [`Web Audio API`](https://webaudio.github.io/web-audio-api/), предназначенная для задания позиции, направления и других характеристик для источника звука в пространстве.
Это потомок `AudioNode`, для которого можно определить позицию в _правой_ Декартовой системе координат, а также направленность звука с помощью системы конусов.

`PannerNode` обрабатывает только один входной сигнал (моно/стерео), выходной сигнал всегда стерео. Трансформация в правый и левый канал производится относительно положения и направления слушателя — `AudioListener`.

Наследует свойства и методы [`AudioNode`](https://webaudio.github.io/web-audio-api/#the-audionode-interface).

##Положение в пространстве

###Свойства

####`positionX`, `positionY`, `positionZ`
Каждое свойство задает соответствующую координату источника звука в трехмерном пространстве.

Являются [AudioParam](https://webaudio.github.io/web-audio-api/#idl-def-AudioParam), поэтому чтобы задать их напрямую, устанавливают их свойство `value`. По умолчанию все равны 0 и могут принимать значения (−∞,∞).

_В FF поддержаны только с [50-й версии](https://bugzilla.mozilla.org/show_bug.cgi?id=1265394), до тех пор для их устновки используется устаревший метод `setPosition`._

####`orientationX`, `orientationY`, `orientationZ`
Вместе составляют вектор направления распространения звука от источника в трехмерном пространстве. Направление влияет на то, какой канал, правый или левый, будет звучать громче, а также на уровень громкости звука. Звук, направленный в противоположную от слушателя сторону, может быть заглушен вплоть до полной тишины.

Являются [AudioParam](https://webaudio.github.io/web-audio-api/#idl-def-AudioParam), поэтому чтобы задать их напрямую, устанавливают их свойство `value`. По умолчанию все, кроме `orientationX` равны 0. Это значит, что по умолчанию звук направлен вдоль координаты X в воображаемой системе координат. Могут принимать значения (−∞,∞).

_В FF поддержаны только с [50-й версии](https://bugzilla.mozilla.org/show_bug.cgi?id=1265394), до тех пор для их устновки используется устаревший метод `setOrientation`._

###Методы

####`setPosition`
**Устаревший**  
Использовался для одновременной установки значений координат источника звука (параметры `x`, `y`, `z`).

####`setOrientation`
**Устаревший**  
Использовался для одновременной установки координат вектора направления источника звука (параметры `x`, `y`, `z`).

##Изменение громкости звука

Громкость звука `PannerNode` может изменяться в двух случаях:
* в зависимости от расстояния между слушателем и источником звука;
* в зависимости от направленности источника звука.

Общий коэффициент изменения громкости звука рассчитывается как произведение составляющих:  
`totalVolumeGain = distanceVolumeGain * coneVolumeGain`.

###Направленность источника

####`coneInnerAngle`
Угол конуса в градусах, внутри которого `coneVolumeGain` будет равен 1. Должен принимать значения в отрезке [0, 360]. Значение по умолчанию — 360 — фактически означает, что звук ненаправлен, то есть равномерно распространяется во все стороны от источника.

####`coneOuterAngle`
Угол конуса в градусах, снаружи которого `coneVolumeGain` будет равен значению свойства `coneOuterGain`. Должен принимать значения в отрезке [0, 360]. Значение по умолчанию — 360.

В случае, если слушатель находится между внутренним конусом и внешним, `coneVolumeGain` постепенно (линейно в зависимости от угла) уменьшается от 1 до `coneOuterGain`.

####`coneOuterGain`
Задает значение `coneVolumeGain` для случая, когда слушатель находится снаружи внешнего конуса. По умолчанию равен 0 и принимает значения [0, 1].

###Расстояние до источника

####`distanceModel`
Свойство, определяющее алгоритм изменения громкости звука в зависимости от расстояния до источника (`distanceVolumeGain`). Значение по умолчанию - `inverse`.

Всего доступны три модели.

#####`linear`

`distanceVolumeGain = 1 - rolloffFactor * (Math.max(Math.min(distance, maxDistance), refDistance) - refDistance) / (maxDistance - refDistance);`

Если расстояние до источника меньше либо равно `refDistance`, `distanceVolumeGain` равен 1. Если расстояние до источника больше либо равно `maxDistance`, `distanceVolumeGain` равен 0.

#####`inverse` (по умолчанию)

`distanceVolumeGain = refDistance / (refDistance + rolloffFactor * (Math.max(distance, refDistance) - refDistance));`

Если расстояние до источника меньше либо равно `refDistance`, `distanceVolumeGain` равен 1. При увеличении расстояния `distanceVolumeGain` стремится к 0. 

#####`exponential`

`distanceVolumeGain = Math.pow(Math.max(distance, refDistance) / refDistance, -state.panner.rolloffFactor);`

Если расстояние до источника меньше либо равно `refDistance`, `distanceVolumeGain` равен 1. При увеличении расстояния `distanceVolumeGain` стремится к 0. 
 
 ...