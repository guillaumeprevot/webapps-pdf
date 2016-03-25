
$(function() {
	var url = 'test.pdf';
	// PDFJS.disableWorker = true;
	// PDFJS.workerSrc = './libs/pdfjs/pdf.worker.js';
	var viewer = {};
	viewer.pdf = null;
	viewer.pageNum = 1;
	viewer.pageRendering = false;
	viewer.pageNumPending = null;
	viewer.scale = 80;
	viewer.rotation = 0;
	viewer.canvas = document.getElementById('pdf-canvas');
	viewer.canvasContext = viewer.canvas.getContext('2d');
	viewer.mousecontrols = false;

	/** Cette fonction parse une date telle que retournée par le fichier PDF */
	function parsePDFDate(s) {
		var text = s;
		if (!text)
			return undefined;
		// Remove the D: prefix if it is available.
		if (text.substring(0,2) === 'D:')
			text = text.substring(2);
		// Get all elements from the PDF date string.
		var year = parseInt(text.substring(0,4));
		var month = parseInt(text.substring(4,6)) - 1;
		var day = parseInt(text.substring(6,8));
		var hours = parseInt(text.substring(8,10));
		var minutes = parseInt(text.substring(10,12));
		var seconds = parseInt(text.substring(12,14));
		var utRel = text.substring(14,15);
		var offsetHours = parseInt(text.substring(15,17));
		var offsetMinutes = parseInt(text.substring(18,20));
		// Deal with timezone
		if (utRel === '-') {
			hours += offsetHours;
			minutes += offsetMinutes;
		} else if (utRel === '+') {
			hours -= offsetHours;
			minutes -= offsetMinutes;
		}
		return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
	}

	// Charger une URL
	function loadURL(url) {
		$('#pdf-start').hide();
		$('#pdf-wait').show();
		$('#pdf-canvas').parent().hide();
		$('#pdf-toolbar').hide();

		PDFJS.getDocument(url).then(function(pdfDoc) {
			viewer.pdf = pdfDoc;
			$('#page-count').text(viewer.pdf.numPages);
			renderPage(1);

			pdfDoc.getMetadata().then(function(data) {
				var tbody = $('#pdf-metadata tbody').empty();
				var metadata = {
					'Titre': data.info.Title,
					'Auteur': data.info.Author,
					'Sujet': data.info.Subject,
					'Mots-clefs': data.info.Keywords,
					'Créé le': parsePDFDate(data.info.CreationDate),
					'Modifié le': parsePDFDate(data.info.ModDate),
					'Créé par': data.info.Creator,
					'Logiciel': data.info.Producer,
					'Version': data.info.PDFFormatVersion
				};
				//console.log(metadata);
				$.each(metadata, function(name, value) {
					$('<tr />').append('<td>' + name + '</td>').append('<td>' + (value || '') + '</td>').appendTo(tbody);
				});
			});
		});
	}

	// Charger un fichier (input[file] ou DnD)
	function loadFile(file) {
		var reader = new FileReader();
		reader.onload = function(e) {
			var url = e.target.result,
				name = file.name,
				size = file.size;
			loadURL(url);
		};
		reader.readAsDataURL(file);
	}

	// Charger la page demandée
	function renderPage(num) {
		// Attendre le fin du chargement de page en cours avant de changer de page
		if (viewer.pageRendering) {
			viewer.pageNumPending = num;
			return;
		}

		// OK, dessiner la page demandée
		viewer.pageRendering = true;
		viewer.pdf.getPage(num).then(function(page) {
			/*
			console.log(page); // page = { pageIndex: 0, pageInfo: { rotate: 0, view:[t,l,w,h]} }
			page.getTextContent({ normalizeWhitespace: true }).then(function(textContent) {
				console.log(textContent.items); // { width: float, height: float, str: 'text', transform: float[6]}
				console.log($.map(textContent.items, (i) => i.str).join(' '));
			});
			*/
			
			var viewport = page.getViewport(viewer.scale / 100.0, viewer.rotation);
			$('#scale-value').text(Math.floor(viewer.scale));
			viewer.canvas.height = viewport.height;
			viewer.canvas.width = viewport.width;

			viewer.pageNum = num;
			pageNum.val(num);
			pageFirst.prop('disabled', num == 1);
			pagePrevious.prop('disabled', num == 1);
			pageNext.prop('disabled', num == viewer.pdf.numPages);
			pageLast.prop('disabled', num == viewer.pdf.numPages);
			$('#pdf-wait').hide();
			$('#pdf-canvas').parent().show();
			$('#pdf-toolbar').show();

			var renderContext = {
				canvasContext: viewer.canvasContext,
				viewport: viewport
			};
			var renderTask = page.render(renderContext);
			renderTask.promise.then(function() {
				viewer.pageRendering = false;
				if (viewer.pageNumPending !== null) {
					var n = viewer.pageNumPending;
					viewer.pageNumPending = null;
					renderPage(n);
				}
			});
		});
	}

	// Changer le zoom et redessiner la page
	function changeScale(value) {
		viewer.scale = value;
		renderPage(viewer.pageNum);
	}

	// Changer la rotation et redessiner la page
	function changeRotation(offset) {
		viewer.rotation = (viewer.rotation + 360 + offset) % 360;
		renderPage(viewer.pageNum);
	}

	// Bouton "Première page"
	var pageFirst = $('#page-first').click(function() {
		if (viewer.pageNum > 1)
			renderPage(1);
	});

	// Bouton précédent
	var pagePrevious = $('#page-previous').click(function() {
		if (viewer.pageNum > 1)
			renderPage(viewer.pageNum - 1);
	});

	// Numéro de page modifiable
	var pageNum = $('#page-num').change(function(event) {
		var num = parseInt(this.value);
		if (num != viewer.pageNum && num >= 1 && num <= viewer.pdf.numPages)
			renderPage(num);
	});

	// Bouton suivant
	var pageNext = $('#page-next').click(function() {
		if (viewer.pageNum < viewer.pdf.numPages)
			renderPage(viewer.pageNum + 1);
	});

	// Bouton "Dernière page"
	var pageLast = $('#page-last').click(function() {
		if (viewer.pageNum < viewer.pdf.numPages)
			renderPage(viewer.pdf.numPages);
	});

	// Bouton "Zoom +"
	var zoomIn = $('#zoom-in').click(function() {
		var increment = (Math.floor(viewer.scale / 100) + 1) * 10;
		changeScale(viewer.scale + increment);
	});

	// Bouton "Zoom -"
	var zoomOut = $('#zoom-out').click(function() {
		var decrement = (Math.floor(viewer.scale / 100) + 1) * 10;
		changeScale(Math.max(10, viewer.scale - decrement));
	});

	// Bouton "Taille réelle"
	var zoomFit = $('#zoom-real').click(function() {
		changeScale(100);
	});

	// Bouton "Page entière"
	var zoomFit = $('#zoom-fit').click(function() {
		var height = window.innerHeight - $('#pdf-toolbar').outerHeight(true) - 20/*canvas parent's margins*/ - $('#pdf-copyright').outerHeight(true),
			width = window.innerWidth- 17/*scroll*/ - 20/*extra margins*/,
			scaleX = width / viewer.canvas.width,
			scaleY = height / viewer.canvas.height;
		changeScale(viewer.scale * Math.min(scaleX, scaleY));
	});

	// Bouton "Pleine largeur"
	var zoomWidth = $('#zoom-width').click(function() {
		var width = window.innerWidth - 17/*scroll*/ - 20/*extra margins*/,
			scaleX = width / viewer.canvas.width;
		changeScale(viewer.scale * scaleX);
	});

	// Boutons ".. %"
	var zoomPct = $('.zoom-pct').click(function() {
		changeScale(parseInt($(this).attr('data-value')));
	});

	// Bouton "Rotation horaire"
	var rotateClockWise = $('#rotate-cw').click(function() {
		changeRotation(90);
	});

	// Bouton "Rotation anti-horaire"
	var rotateCounterClockWise = $('#rotate-ccw').click(function() {
		changeRotation(-90);
	});

	// Contrôles au clavier
	$(document.body).on('keydown', function(event) {
		if (event.target.tagName === 'INPUT')
			return;
		var keyCode = event.which || event.keyCode,
			ctrl = event.ctrlKey,
			prevent = true;
		switch(keyCode) {
		case 36: // home
			pageFirst.click();
			break;
		case 37: // left
			(ctrl ? pageFirst : pagePrevious).click();
			break;
		case 33: // pageup
			pagePrevious.click();
			break;
		case 34: // pagedown
			pageNext.click();
			break;
		case 39: // right
			(ctrl ? pageLast : pageNext).click();
			break;
		case 35: // end
			pageLast.click();
			break;
		default:
			prevent = false;
		}
		if (prevent)
			event.preventDefault();
	}).on('keypress', function(event) {
		if (event.target.tagName === 'INPUT')
			return;
		var s = String.fromCharCode(event.charCode),
			prevent = true;
		switch (s.charAt(0)) {
			case '+':
				zoomIn.click();
				break;
			case '-':
				zoomOut.click();
				break;
			case '0':
				zoomFit.click();
				break;
			default:
				prevent = false;
		}
		if (prevent)
			event.preventDefault();
	});

	// Contrôles à la souris
	if (! viewer.mousecontrols) {
		$('#pdf-controls tr > :nth-child(3)').hide();
		$('#pdf-help > .modal-dialog').removeClass('modal-lg');
	} else {
		$(document.body).on('wheel mousewheel', function(event) {
			var ctrl = event.ctrlKey,
				delta;
			if (event.originalEvent.deltaY)
				delta = - event.originalEvent.deltaY;
			else if (event.originalEvent.wheelDelta)
				delta = event.originalEvent.wheelDelta;
			else if (event.originalEvent.detail)
				delta = - event.originalEvent.detail;
			if (!delta)
				return;
			event.preventDefault();
			if (delta < 0)
				(ctrl ? pageLast : pageNext).click();
			else if (delta > 0)
				(ctrl ? pageFirst : pagePrevious).click();
		});
		var preventNextContextMenu = false, leftClickTimeout = undefined;
		$('#pdf-canvas').on('mouseup', function(event) {
			if (event.button === 2) {
				preventNextContextMenu = true;
				zoomOut.click();
			}
		}).on('click', function(event) {
			if (event.button !== 2 && event.originalEvent.detail == 1) {
				leftClickTimeout = setTimeout(function() {
					zoomIn.click();
					leftClickTimeout = undefined;
				}, 300);
			}
		}).on('dblclick', function(event) {
			if (leftClickTimeout) {
				clearTimeout(leftClickTimeout);
				leftClickTimeout = undefined;
			}
			zoomFit.click();
		}).on('contextmenu', function(event) {
			if (preventNextContextMenu) {
				event.preventDefault();
				preventNextContextMenu = false;
			}
		});
	}

	// Ouverture d'un fichier local
	$('#open-file-button,#pdf-start').on('click', function() {
		$('#open-file-input').click();
	});
	$('#open-file-input').on('change', function(event) {
		var files = this.files;
		if (files && files.length > 0)
			loadFile(files[0]);
	});
	$('#pdf-start').on('dragenter dragover', function(event) {
		event.preventDefault();
	}).on('drop', function(event) {
		event.preventDefault();
		loadFile(event.originalEvent.dataTransfer.files[0]);
	});
});