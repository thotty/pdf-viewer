/**
 *
 * @requires jQuery ($)
 * @requires PDF.js (PDFJS)
 * @requires Bootstrap v2.1.1 (CSS, Carousel)
 *
 * @param {Object} options Object with {jQuery Object} "pdfViewerContainer"
 *                                     {string}        "style"
 *                                     {string}        "i18n"
 *                                     {integer}       "initialPage"
 *                                     {boolean}       "debugNoise"
 * @return {Object}
 */
var PDFViewer = function (options) {

    'use strict';

    var _options,
        _viewObjects,
        _control,
        _pdf,
        _i18n,
        _debugNoise,
        _fail,
        _getOptions,
        _getClass,
        _getRandomId,
        _mountViewObjects,
        _actions;

    /**
     * @type {Object}
     */
    _options = $.extend({
        pdfViewerContainer: $(),
        style: 'bootstrap-v2.1.1',
        i18n: 'pt-BR',
        initialPage: 1,
        debugNoise: false
    }, options);

    /**
     * @type {Object}
     */
    _viewObjects = {
        supremeContainer: null,
        elements: {
            preview: null,
            thumbs: null,
            progress: null
        },
        subElements: {
            progressBar: null,
            thumbsContainer: null,
            thumbnails: [],
            previewBox: null,
            prev: null,
            next: null,
            pager: null
        }
    };

    /**
     * @type {Object}
     */
    _control = {
        pagePending: null,
        pageRendering: false,
        thumbPending: null,
        thumbRendering: false
    };

    /**
     * @type {Object}
     */
    _pdf = {
        document: null,
        page: 0
    };

    /**
     * @return {string}
     */
    _i18n = function (key, args) {
        var index,
            text,
            dictionary = {
                "en-US": {
                    prevPage: '&larr; Previous Page',
                    nextPage: 'Next Page &rarr;',
                    pager: '{page}/{pages}',
                    prevThumbs: '&lsaquo;',
                    nextThumbs: '&rsaquo;',
                    pageLabel: 'Page {page}'
                },
                "pt-BR": {
                    prevPage: '&larr; Página Anterior',
                    nextPage: 'Próxima página &rarr;',
                    pager: 'Página <strong>{page}</strong> de <strong>{pages}</strong>.',
                    prevThumbs: '&laquo;',
                    nextThumbs: '&raquo;',
                    pageLabel: 'Página {page}'
                }
            };

        text = dictionary[_getOptions('i18n')][key];

        if (args !== undefined) {
            for (index in args) {
                if (args.hasOwnProperty(index)) {
                    text = text.replace('{' + index + '}', args[index]);
                }
            }
        }

        return text;
    };

    /**
     * @return {undefined}
     */
    _debugNoise = function () {
        if (_getOptions('debugNoise')) {
            var args = [].slice.apply(arguments);
            args.unshift('[PDFViewer debug noise]');
            // args.unshift((new Date()).toString());
            //Troque a expressão do "if" para "true" para um debug à nível de [PDF.js]
            if ('[PDF.js]' !== args[1]) {
                console.debug.apply(console, args);
            }
        }
    };

    /**
     * @param {string} error
     * @return {undefined}
     */
    _fail = function (error) {
        _debugNoise('): Fail!', arguments);
        _errorCallback.apply(null,arguments);
        throw new Error('[PDFViewer Fail] ): ' + error);
    };

    /**
     * @param  {string} what
     * @return {mixed}
     */
    _getOptions = function (what) {
        if (_options.hasOwnProperty(what)) {
            return _options[what];
        }
        _fail('"' + what + '" not found in "_options"');
    };

    /**
     * @param  {mixed} klass
     * @return {string}
     */
    _getClass = function (klass) {
        var prefix = 'pdf-viewer-';
        if (typeof klass === 'string') {
            return prefix + klass;
        }
        if (typeof klass.join === 'function') {
            return prefix + klass.join(' ' + prefix);
        }
        return '';
    };

    _getRandomId = function (element) {
        var prefix = 'pdf-viewer-',
            id = prefix + element + '_' + Math.ceil(Math.random() * 10000);
        if ($('#' + id).length) {
            return _getRandomId(element);
        }
        return id;
    };

    /**
     * @return {undefined}
     */
    _mountViewObjects = function () {
        var __element,
            __klass,
            __found;

        var __applyDecorator = function (element) {
            var decorator = {};
            //@todo: implementar outros estilos...
            //       decorator['style'] = function (element) {/*...*/};

            decorator['bootstrap-v2.1.1'] = function (element) {
                var wrapper = $('<div />').addClass('row-fluid');
                element.addClass('span12').wrap(wrapper);
            };

            decorator[_getOptions('style')](element);
        };

        _debugNoise("Montando os objetos da view dentro do conteiner...");

        _viewObjects.supremeContainer = _getOptions('pdfViewerContainer');
        _viewObjects.supremeContainer.addClass(_getClass('container'));

        for (__element in _viewObjects.elements) {
            if (_viewObjects.elements.hasOwnProperty(__element)) {
                __klass = _getClass(__element);
                __found = _viewObjects.supremeContainer.find('.' + __klass);

                _debugNoise('Elemento: ', __element, __klass);

                if (__found.length) {
                    _viewObjects.elements[__element] = __found;
                } else {
                    _viewObjects.elements[__element] = $('<div />').addClass(__klass);
                    _viewObjects.supremeContainer.prepend(
                        _viewObjects.elements[__element]
                    );
                    __applyDecorator(_viewObjects.elements[__element]);
                }
                _viewObjects.elements[__element].addClass(_getClass('element'));
            }
        }

        //Progress bar
        (function progressBarClosure() {
            var decorator = {};
            //@todo: implementar outros estilos...
            //       decorator['style'] = function (progressContainer) {/*...*/};

            decorator['bootstrap-v2.1.1'] = function (progressContainer) {
                _viewObjects.subElements.progressBar = $('<div />');
                _viewObjects.subElements.progressBar.addClass('bar bar-success');
                _viewObjects.subElements.progressBar.css('width', '0%');
                progressContainer.addClass('progress progress-striped');
                progressContainer.append(_viewObjects.subElements.progressBar);
            };

            decorator[_getOptions('style')](_viewObjects.elements.progress);
            _viewObjects.subElements.progressBar.addClass(_getClass([
                'sub-element',
                'progress-bar'
            ]));
        }());

        //Thumbs
        (function thumbsClosure() {
            var decorator = {};
            //@todo: implementar outros estilos...
            //       decorator['style'] = function (container) {/*...*/};

            decorator['bootstrap-v2.1.1'] = function (container) {
                var containerId = _getRandomId('thumbsContainer'),
                    carouselContainer = $('<div />').addClass('carousel-inner'),
                    carouselFirstItem = $('<div />').addClass('item active'),
                    carouselControlLeft = $('<a />').addClass('carousel-control left'),
                    carouselControlRight = $('<a />').addClass('carousel-control right');

                carouselControlLeft.attr({
                    "href": "#" + containerId,
                    "data-slide": "prev"
                });
                carouselControlLeft.html(_i18n('prevThumbs'));
                // carouselControlLeft.bind('click', function () {
                //     _actions.slidLeftThumbs();
                // });
                carouselControlRight.attr({
                    "href": "#" + containerId,
                    "data-slide": "next"
                });
                carouselControlRight.html(_i18n('nextThumbs'));
                // carouselControlRight.bind('click', function () {
                //     _actions.slidRightThumbs();
                // });

                carouselContainer.append(carouselFirstItem);

                container.attr({
                    "id": containerId,
                    "data-interval": "false"
                });
                container.addClass('carousel slide hidden-phone');
                container.append(carouselContainer);
                container.append(carouselControlLeft);
                container.append(carouselControlRight);
                container.bind('slid', function () {
                    _debugNoise('Escorregou a(s) miniatura(s)');
                    carouselContainer.find('.' + _getClass('thumb') + ':visible').each(function () {
                        _actions.queueRenderThumb($(this));
                    });
                });
            };

            _viewObjects.subElements.thumbsContainer = $('<div />').addClass(_getClass([
                'sub-element',
                'thumbs-container'
            ]));

            _viewObjects.elements.thumbs.append(_viewObjects.subElements.thumbsContainer);

            decorator[_getOptions('style')](_viewObjects.subElements.thumbsContainer);
        }());

        //Preview box
        (function previewBoxClosure() {
            var bindEvents,
                labelit,
                decorator = {};
            //@todo: implementar outros estilos...
            //       decorator['style'] = function (container, box, prev, next, pager) {/*...*/};

            decorator['bootstrap-v2.1.1'] = function (container, box, prev, next, pager) {
                var rowPager = $('<div />').addClass('row-fluid'),
                    rowBox = $('<div />').addClass('row-fluid'),
                    pagerContainer = $('<ul />').addClass('pager'),
                    prevItem = $('<li />').addClass('previous'),
                    pagerItem = $('<li />'),
                    nextItem = $('<li />').addClass('next');

                rowPager.append(pagerContainer).appendTo(container);
                rowBox.append(box).appendTo(container);

                prev.appendTo(pagerContainer).wrap(prevItem);
                pager.appendTo(pagerContainer).wrap(pagerItem);
                next.appendTo(pagerContainer).wrap(nextItem);
            };

            bindEvents = function (prev, next) {
                prev.bind('click', function (event) {
                    _actions.prevPage();
                    event.stopPropagation();
                    return false;
                });
                next.bind('click', function (event) {
                    _actions.nextPage();
                    event.stopPropagation();
                    return false;
                });
            };

            labelit = function (prev, next) {
                prev.html(_i18n('prevPage'));
                next.html(_i18n('nextPage'));
            };

            _viewObjects.subElements.prev = $('<a href="javascript:void(0);" />').addClass(_getClass([
                'sub-element',
                'prev'
            ]));
            _viewObjects.subElements.next = $('<a href="javascript:void(0);" />').addClass(_getClass([
                'sub-element',
                'next'
            ]));
            _viewObjects.subElements.pager = $('<span />').addClass(_getClass([
                'sub-element',
                'pager',
                'pager-loading',
            ]));
            _viewObjects.subElements.previewBox = $('<canvas />').addClass(_getClass([
                'sub-element',
                'preview-box'
            ]));

            decorator[_getOptions('style')](
                _viewObjects.elements.preview,
                _viewObjects.subElements.previewBox,
                _viewObjects.subElements.prev,
                _viewObjects.subElements.next,
                _viewObjects.subElements.pager
            );
            bindEvents(
                _viewObjects.subElements.prev,
                _viewObjects.subElements.next
            );
            labelit(
                _viewObjects.subElements.prev,
                _viewObjects.subElements.next
            );
        }());

        _debugNoise('View Objects', _viewObjects);
    };

    /**
     * @type {Object}
     */
    _actions = {
        /**
         * @param  {integer} percent
         * @return {undefined}
         */
        progress: function (percent) {
            var decorator = {};
            //@todo: implementar outros estilos...
            //       decorator['style'] = function (percent, progressBar, progressContainer) {/*...*/};

            decorator['bootstrap-v2.1.1'] = function (percent, progressBar, progressContainer) {
                progressBar.width(percent + '%');
                if (0 >= percent || percent >= 100) {
                    progressContainer.removeClass('active');
                } else {
                    progressContainer.addClass('active');
                }
            };
            decorator[_getOptions('style')](
                percent,
                _viewObjects.subElements.progressBar,
                _viewObjects.elements.progress
            );
            _debugNoise('Progresso', percent);
        },
        /**
         * @return {undefined}
         */
        initializeThumbs: function () {
            var index,
                pageNumber,
                decorator = {};
            //@todo: implementar outros estilos...
            //       decorator['style'] = function (container, thumbs) {/*...*/};

            decorator['bootstrap-v2.1.1'] = function (container, thumbs) {
                var thumbsTotal = _actions.getTotalPages(),
                    thumbsLimit = 5,
                    thumbsIndex = 0,
                    carouselIndex = 1,
                    carouselContainer = container.find('.carousel-inner'),
                    carouselFirstItem = carouselContainer.find('.item.active:eq(0)'),
                    carouselControls = container.find('.carousel-control'),
                    carouselItem,
                    itemThumbsCointainer,
                    itemThumbBlankLeft,
                    itemThumbBlankRight,
                    itemThumbs,
                    itemThumbLoop;

                if (thumbsTotal <= thumbsLimit) {
                    carouselControls.remove();
                }

                itemThumbLoop = function (thumb) {
                    var itemThumb = $('<li />').addClass('span2'),
                        thumbLabel = $('<p />'),
                        thumbWrapper = $('<a href="javascript:void(0);" />').addClass('thumbnail'),
                        page = thumb.data('thumb-page');

                    _debugNoise('Monta a miniatura no carrosel: thumb ', thumb);

                    thumbWrapper.addClass(_getClass([
                        'sub-element',
                        'thumb'
                    ]));

                    thumbWrapper.bind('click', function () {
                        _debugNoise('Abre a miniatura', page);
                        _actions.queueRenderPage(page);
                    });

                    thumbLabel.html(_i18n('pageLabel', {
                        page: page
                    }));
                    thumbWrapper.append(thumbLabel);
                    thumbWrapper.append(thumb);
                    itemThumb.append(thumbWrapper);
                    itemThumbsCointainer.append(itemThumb);
                };

                while (thumbsIndex <= thumbsTotal) {
                    _debugNoise('Monta as miniaturas no carrosel: item', carouselIndex);

                    itemThumbs = thumbs.slice(thumbsIndex, thumbsLimit + thumbsIndex);
                    if (itemThumbs.length) {
                        carouselItem = carouselFirstItem;
                        if (carouselIndex > 1) {
                            carouselItem = $('<div />').addClass('item').appendTo(carouselContainer);
                        }
                        itemThumbsCointainer = $('<ul />').addClass('thumbnails');
                        itemThumbBlankLeft = $('<li />').addClass('span1');
                        itemThumbBlankRight = $('<li />').addClass('span1');

                        itemThumbsCointainer.append(itemThumbBlankLeft);
                        itemThumbs.forEach(itemThumbLoop);
                        itemThumbsCointainer.append(itemThumbBlankRight);

                        carouselItem.append(itemThumbsCointainer);
                    }

                    thumbsIndex += thumbsLimit;
                    ++carouselIndex;
                }

                container.trigger('slid');
            };

            _debugNoise('Inicializa as miniaturas', _actions.getTotalPages());
            for (index = 0; index < _actions.getTotalPages(); index++) {
                pageNumber = index + 1;
                _debugNoise('Inicializa a miniatura da página', pageNumber);
                _viewObjects.subElements.thumbnails[index] = $('<canvas />').addClass(_getClass([
                    'sub-element',
                    'thumb-box'
                ])).data('thumb-page', pageNumber);
            }
            _debugNoise('Miniaturas', _viewObjects.subElements.thumbnails);
            decorator[_getOptions('style')](_viewObjects.subElements.thumbsContainer, _viewObjects.subElements.thumbnails);
        },
        /**
         * @param  {Object jQuery} visibleThumb
         * @return {undefined}
         */
        renderThumb: function (visibleThumb) {
            var decorator = {};
            //@todo: implementar outros estilos...
            //       decorator['style'] = function (thumb) {/*...*/};

            decorator['bootstrap-v2.1.1'] = function (thumbWrapper, thumb) {
                if (!thumbWrapper.data('rendered')) {
                    var pageNumber = thumb.data('thumb-page');

                    thumbWrapper.addClass(_getClass('thumb-loading'));
                    _actions.renderCanvas(thumb.get(0), 0.5, pageNumber, {
                        error: function () {
                            _debugNoise('Miniatura não renderizada!', pageNumber);
                            thumbWrapper.data('rendered', false);
                            thumbWrapper.removeClass(_getClass('thumb-loading'));
                        },
                        success: function () {
                            _debugNoise('Miniatura renderizada!', pageNumber);
                            if (_control.thumbPending !== null) {
                                _debugNoise('Renderiza a miniatura pendente', _control.thumbPending);
                                _actions.renderThumb(_control.thumbPending);
                                _control.thumbPending = null;
                            }
                            thumbWrapper.data('rendered', true);
                            thumbWrapper.removeClass(_getClass('thumb-loading'));
                        }
                    });
                } else {
                    _debugNoise('Miniatura já renderizada');
                }
            };

            decorator[_getOptions('style')](
                visibleThumb,
                visibleThumb.find('.' + _getClass('thumb-box'))
            );
        },
        /**
         * @param {integer} pageNumber
         * @return {undefined}
         */
        renderPage: function (pageNumber) {
            var rendering = function (active) {
                var decorator = {};
                //@todo: implementar outros estilos...
                //       decorator['style'] = function (active, progressContainer, thumbsContainer, pager, pageNumber) {/*...*/};

                decorator['bootstrap-v2.1.1'] = function (active, progressContainer, thumbsContainer, pager, pageNumber) {
                    var thumbClass = _getClass('thumb'),
                        selectedThumbClass = _getClass('thumb-selected'),
                        renderingProgressClass = 'active',
                        thumbs = thumbsContainer.find('.' + thumbClass);

                    pager.html('');

                    if (active) {
                        pager.addClass(_getClass('pager-loading'));
                        progressContainer.addClass(renderingProgressClass);
                        thumbs.removeClass(selectedThumbClass);
                    } else {
                        progressContainer.fadeOut(2000);
                        progressContainer.removeClass(renderingProgressClass);
                        thumbs.eq(pageNumber - 1).addClass(selectedThumbClass);
                    }
                };
                decorator[_getOptions('style')](
                    active,
                    _viewObjects.elements.progress,
                    _viewObjects.subElements.thumbsContainer,
                    _viewObjects.subElements.pager,
                    pageNumber
                );
                _control.pageRendering = active;
            };

            rendering(true);

            _debugNoise('Renderizando a página', pageNumber);

            _actions.renderCanvas(_viewObjects.subElements.previewBox.get(0), 2, pageNumber, {
                error: function () {
                    _debugNoise('Página não renderizada!', pageNumber);
                    rendering(false);
                },
                success: function () {
                    _debugNoise('Página renderizada!', pageNumber);
                    rendering(false);
                    if (_control.pagePending !== null) {
                        _debugNoise('Renderiza a página pendente', _control.pagePending);
                        _actions.renderPage(_control.pagePending);
                        _control.pagePending = null;
                    }
                    _pdf.page = pageNumber;
                    _viewObjects.subElements.pager.removeClass(_getClass('pager-loading'));
                    _viewObjects.subElements.pager.html(
                        _i18n('pager', {
                            page: _pdf.page,
                            pages: _actions.getTotalPages()
                        })
                    );
                }
            });
        },
        /**
         * @param  {HTMLCanvasElement} canvas
         * @param  {integer} scale
         * @param  {integer} page
         * @param  {Object} callbacks {error: Function, success: Function}
         * @return {undefined}
         */
        renderCanvas: function (canvas, scale, page, callbacks) {
            var getPagePromise = _pdf.document.getPage(page);

            _debugNoise('[PDF.js]', 'getPagePromise', getPagePromise);

            getPagePromise.catch(function () {
                callbacks.error();
                _fail('[PDF.js] :( getPagePromise.catch', arguments);
            });

            getPagePromise.then(function (pdfPageProxy) {
                var renderTask,
                    viewport = pdfPageProxy.getViewport(scale);

                _debugNoise('[PDF.js]', 'pdfPageProxy', pdfPageProxy);

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                renderTask = pdfPageProxy.render({
                    "canvasContext": canvas.getContext('2d'),
                    "viewport": viewport
                });

                _debugNoise('[PDF.js]', 'renderTask', renderTask);

                renderTask.promise.catch(function () {
                    callbacks.error();
                    _fail('[PDF.js] :( renderTask.promise.catch', arguments);
                });

                renderTask.promise.then(function () {
                    callbacks.success();
                });
            });
        },
        /**
         * @param  {HTMLCanvasElement} visibleThumb
         * @return {undefined}
         */
        queueRenderThumb: function (visibleThumb) {
            _debugNoise('Enfileirando a renderização da miniatura', visibleThumb);
            if (_control.thumbRendering) {
                _debugNoise('Miniatura pendente', visibleThumb);
                _control.thumbPending = visibleThumb;
            } else {
                _debugNoise('Renderiza a miniatura', visibleThumb);
                _actions.renderThumb(visibleThumb);
            }
        },
        /**
         * @param  {integer} pageNumber
         * @return {undefined}
         */
        queueRenderPage: function (pageNumber) {
            _debugNoise('Enfileirando a renderização da página', pageNumber);
            if (_control.pageRendering) {
                _debugNoise('Página pendente', pageNumber);
                _control.pagePending = pageNumber;
            } else {
                _debugNoise('Renderiza a página', pageNumber);
                _actions.renderPage(pageNumber);
            }
        },
        /**
         * @return {undefined}
         */
        prevPage: function () {
            _debugNoise('Me dê a página anterior...');
            if (_pdf.page <= 1) {
                _debugNoise('Esquece, já estou na primeira página');
                return;
            }
            _pdf.page--;
            _actions.queueRenderPage(_pdf.page);
        },
        /**
         * @return {undefined}
         */
        nextPage: function () {
            _debugNoise('Me dê a próxima página...');
            if (_pdf.page >= _actions.getTotalPages()) {
                _debugNoise('Esquece, já estou na última página');
                return;
            }
            _pdf.page++;
            _actions.queueRenderPage(_pdf.page);
        },
        /**
         * @param  {string}
         * @return {undefined}
         */
        loadViewer: function (url) {
            var pdfDocumentLoadingTask,
                onFulfilled,
                onRejected;

            _debugNoise('- Carregando PDF (' + url + ')...');

            try {
                PDFJS.disableTextLayer = true;
                _debugNoise('[PDF.js]', 'PDFJS', PDFJS);
            } catch (error) {
                _fail('Biblioteca PDF.js não encontrada', error);
            }

            pdfDocumentLoadingTask = PDFJS.getDocument(url);
            _debugNoise('[PDF.js]', 'pdfDocumentLoadingTask', pdfDocumentLoadingTask);

            pdfDocumentLoadingTask.onProgress = function (progress) {
                var percent = parseInt((progress.loaded / progress.total) * 100, 10);
                _actions.progress(percent);
            };

            onFulfilled = function (pdfDocument) {
                _debugNoise('[PDF.js]', ':) onFulfilled', pdfDocument);
                _pdf.document = pdfDocument;
                _actions.renderPage(_getOptions('initialPage'));
                _actions.initializeThumbs();
            };

            onRejected = function () {
                _fail('[PDF.js] :( onRejected', arguments);
            };

            pdfDocumentLoadingTask.then(onFulfilled, onRejected);
        },
        /**
         * @return {integer}
         */
        getTotalPages: function () {
            return _pdf.document.numPages;
        }
    };

    _debugNoise('😀 Iniciando...', _options);
    return (function initClosure() {
        if (!_getOptions('pdfViewerContainer').length) {
            _fail('Informe o conteiner do visualizador');
        }

        _mountViewObjects();

        return {
            load: _actions.loadViewer,
            getPages: _actions.getTotalPages,
            error: function (callback) {
                _debugNoise('Registrando o callback de erro');
                _fail = callback;
            }
        };
    }());
};