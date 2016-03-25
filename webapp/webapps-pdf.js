function PDFViewer(canvas) {
	// loaded, metadataloaded, scalechanged, pagechanged
	this.pdf = null;
	this.pageIndex = 1;
	this.pageRendering = false;
	this.pageIndexPending = null;
	this.scale = 80;
	this.rotation = 0;
	this.canvas = canvas;
	this.canvasContext = canvas.getContext('2d');
}

/** Cette méthode lance l'évènement demandé, prévenant ainsi d'éventuels listeners */
PDFViewer.prototype.trigger = function(event, extraParameters) {
	$(this).trigger(event, extraParameters);
};

/** Cette méthode enregistre un nouveau listener pour l'évènement indiqué */
PDFViewer.prototype.on = function(events, handler, data) {
	if (typeof data === 'object')
		$(this).on(events, data, handler);
	else
		$(this).on(events, handler);
};

/** Cette fonction parse une date telle que retournée par le fichier PDF */
PDFViewer.prototype.parsePDFDate = function(s) {
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
};

PDFViewer.prototype.getPageIndex = function() {
	return (typeof this.pdf === 'undefined') ? 0 : this.pageIndex;
};

PDFViewer.prototype.getPageCount = function() {
	return (typeof this.pdf === 'undefined') ? 0 : this.pdf.numPages;
};

PDFViewer.prototype.getScale = function() {
	return this.scale;
};

PDFViewer.prototype.getRotation = function() {
	return this.rotation;
};

/** Cette méthode charge le document PDF à l'URL indiquée */
PDFViewer.prototype.loadURL = function(url) {
	var viewer = this;
	PDFJS.getDocument(url).then(function(pdfDoc) {
		viewer.pdf = pdfDoc;
		viewer.trigger('loaded', {
			pageCount: viewer.pdf.numPages
		});

		viewer.renderPage(1);

		viewer.pdf.getMetadata().then(function(data) {
			var metadata = {
				'Titre': data.info.Title,
				'Auteur': data.info.Author,
				'Sujet': data.info.Subject,
				'Mots-clefs': data.info.Keywords,
				'Créé le': viewer.parsePDFDate(data.info.CreationDate),
				'Modifié le': viewer.parsePDFDate(data.info.ModDate),
				'Créé par': data.info.Creator,
				'Logiciel': data.info.Producer,
				'Version': data.info.PDFFormatVersion
			};
			//console.log(metadata);
			viewer.trigger("metadataloaded", metadata);
		});
	});
};

/** Cette méthode charge le fichier PDF indiqué, obtenu par exemple via une input[file] ou un DnD */
PDFViewer.prototype.loadFile = function(file) {
	var viewer = this;
	var reader = new FileReader();
	reader.onload = function(e) {
		var url = e.target.result;
		viewer.loadURL(url);
	};
	reader.readAsDataURL(file);
};

/** Cette méthode demande à revenir à la première page */
PDFViewer.prototype.renderFirstPage = function() {
	if (this.pageIndex > 1)
		this.renderPage(1);
};

/** Cette méthode demande à revenir à la page précédente */
PDFViewer.prototype.renderPreviousPage = function() {
	if (this.pageIndex > 1)
		this.renderPage(this.pageIndex - 1);
};

/** Cette méthode demande à aller à la page suivante */
PDFViewer.prototype.renderNextPage = function() {
	if (this.pageIndex < this.pdf.numPages)
		this.renderPage(this.pageIndex + 1);
};

/** Cette méthode demande à aller à la dernière page */
PDFViewer.prototype.renderLastPage = function() {
	if (this.pageIndex < this.pdf.numPages)
		this.renderPage(this.pdf.numPages);
};

/** Cette méthode demande à aller à la page indiquée */
PDFViewer.prototype.renderPage = function(pageIndex) {
	var viewer = this;
	if (viewer.pageRendering) {
		// Attendre le fin du chargement de page en cours avant de changer de page
		viewer.pageIndexPending = pageIndex;
	} else {
		// OK, dessiner la page demandée
		viewer.pageRendering = true;
		viewer.pdf.getPage(pageIndex).then(function(page) {
			/*
			console.log(page); // page = { pageIndex: 0, pageInfo: { rotate: 0, view:[t,l,w,h]} }
			page.getTextContent({ normalizeWhitespace: true }).then(function(textContent) {
				console.log(textContent.items); // { width: float, height: float, str: 'text', transform: float[6]}
				console.log($.map(textContent.items, (i) => i.str).join(' '));
			});
			*/

			var viewport = page.getViewport(viewer.scale / 100.0, viewer.rotation);
			viewer.trigger('scalechanged', {
				scale: viewer.scale
			});
			viewer.canvas.height = viewport.height;
			viewer.canvas.width = viewport.width;

			viewer.pageIndex = pageIndex;
			viewer.trigger('pagechanged', {
				pageIndex: pageIndex,
				pageCount: viewer.pdf.numPages
			});

			var renderContext = {
				canvasContext: viewer.canvasContext,
				viewport: viewport
			};
			var renderTask = page.render(renderContext);
			renderTask.promise.then(function() {
				viewer.pageRendering = false;
				if (viewer.pageIndexPending !== null) {
					var n = viewer.pageIndexPending;
					viewer.pageIndexPending = null;
					viewer.renderPage(n);
				}
			});
		});
	}
};

/** Zoomer un peu plus (+10 entre 0 et 100, +20 entre 100 et 200, +30 entre 200 et 300, ...) */
PDFViewer.prototype.zoomIn = function() {
	var increment = (Math.floor(this.scale / 100) + 1) * 10;
	this.changeScale(this.scale + increment);
};

/** Zoomer un peu plus (-10 entre 0 et 100, -20 entre 100 et 200, -30 entre 200 et 300, ...) */
PDFViewer.prototype.zoomOut = function() {
	var decrement = (Math.floor(this.scale / 100) + 1) * 10;
	this.changeScale(Math.max(10, this.scale - decrement));
};

/** Positionner le zoom à 100% (taille réelle) */
PDFViewer.prototype.zoomReal = function() {
	this.changeScale(100);
};

/** Ajuster le zoom pour que la page s'affiche en entière */
PDFViewer.prototype.zoomFit = function(maxWidth, maxHeight) {
	var widthFactor = maxWidth / this.canvas.width,
		heightFactor = maxHeight / this.canvas.height;
	this.changeScale(this.scale * Math.min(widthFactor, heightFactor));
};

/** Ajuster le zoom pour que la page s'affiche en pleine largeur */
PDFViewer.prototype.zoomWidth = function(newWidth) {
	var currentWidth = this.canvas.width,
		currentScale = this.scale;
	this.changeScale(currentScale * newWidth / currentWidth);
};

/** Changer le zoom et redessiner la page */
PDFViewer.prototype.changeScale = function(value) {
	this.scale = value;
	this.renderPage(this.pageIndex);
};

/** Fait pivoter la page dans le sens des aiguilles d'une montre */
PDFViewer.prototype.rotateClockWise = function() {
	this.changeRotation(90);
};

/** Fait pivoter la page dans le sens inverse des aiguilles d'une montre */
PDFViewer.prototype.rotateCounterClockWise = function() {
	this.changeRotation(-90);
};

/** Changer la rotation et redessiner la page */
PDFViewer.prototype.changeRotation = function(offset) {
	this.rotation = (this.rotation + 360 + offset) % 360;
	this.renderPage(this.pageIndex);
};

$(function() {
	// PDFJS.disableWorker = true;
	// PDFJS.workerSrc = './libs/pdfjs/pdf.worker.js';
	var url = 'test.pdf';
	var viewer = new PDFViewer($('#pdf-container').children('canvas')[0]);

	viewer.on('loaded', function(event, data) {
		$('#page-count').text(data.pageCount);
	});

	viewer.on('metadataloaded', function(event, data) {
		var tbody = $('#pdf-metadata tbody').empty();
		$.each(data, function(name, value) {
			$('<tr />').append('<td>' + name + '</td>').append('<td>' + (value || '') + '</td>').appendTo(tbody);
		});
	});

	viewer.on('scalechanged', function(event, data) {
		$('#scale-value').text(Math.floor(data.scale));
	});

	viewer.on('pagechanged', function(event, data) {
		var pageIndex = data.pageIndex, pageCount = data.pageCount;
		pageInput.val(pageIndex);
		pageFirst.prop('disabled', pageIndex == 1);
		pagePrevious.prop('disabled', pageIndex == 1);
		pageNext.prop('disabled', pageIndex == pageCount);
		pageLast.prop('disabled', pageIndex == pageCount);
		$('#pdf-wait').hide();
		$('#pdf-container').show();
		$('#pdf-toolbar').show();
	});

	// Charger un fichier (input[file] ou DnD) ou une URL
	function load(file, url) {
		$('#pdf-start').hide();
		$('#pdf-wait').show();
		$('#pdf-container').hide();
		$('#pdf-toolbar').hide();
		if (file)
			viewer.loadFile(file);
		else
			viewer.loadURL(url);
	}

	// Bouton "Première page"
	var pageFirst = $('#page-first').click(viewer.renderFirstPage.bind(viewer));
	// Bouton précédent
	var pagePrevious = $('#page-previous').click(viewer.renderPreviousPage.bind(viewer));
	// Numéro de page modifiable
	var pageInput = $('#page-input').change(function(event) {
		var num = parseInt(this.value);
		if (num != viewer.getPageIndex() && num >= 1 && num <= viewer.getPageCount())
			viewer.renderPage(num);
	});
	// Bouton suivant
	var pageNext = $('#page-next').click(viewer.renderNextPage.bind(viewer));
	// Bouton "Dernière page"
	var pageLast = $('#page-last').click(viewer.renderLastPage.bind(viewer));

	// Bouton "Zoom +"
	var zoomIn =$('#zoom-in').click(viewer.zoomIn.bind(viewer));
	// Bouton "Zoom -"
	var zoomOut = $('#zoom-out').click(viewer.zoomOut.bind(viewer));
	// Bouton "Taille réelle"
	var zoomReal = $('#zoom-real').click(viewer.zoomReal.bind(viewer));
	// Bouton "Page entière"
	var zoomFit = $('#zoom-fit').click(function() {
		var height = window.innerHeight - $('#pdf-toolbar').outerHeight(true) - 20/*canvas parent's margins*/ - $('#pdf-copyright').outerHeight(true),
			width = window.innerWidth- 17/*scroll*/ - 20/*extra margins*/;
		viewer.zoomFit(width, height);
	});
	// Bouton "Pleine largeur"
	var zoomWidth = $('#zoom-width').click(function() {
		var width = window.innerWidth - 17/*scroll*/ - 20/*extra margins*/;
		viewer.zoomWidth(width);
	});
	// Boutons ".. %"
	var zoomPct = $('.zoom-pct').click(function() {
		viewer.changeScale(parseInt($(this).attr('data-value')));
	});

	// Bouton "Rotation horaire"
	var rotateClockWise = $('#rotate-cw').click(viewer.rotateClockWise.bind(viewer));
	// Bouton "Rotation anti-horaire"
	var rotateCounterClockWise = $('#rotate-ccw').click(viewer.rotateCounterClockWise.bind(viewer));

	// Contrôles au clavier
	$(document.body).on('keypress', function(event) {
		if (event.target.tagName === 'INPUT' || event.ctrlKey)
			return;
		var keyCode = event.which || event.keyCode,
			prevent = true;
		switch(keyCode) {
			case 36: // home
				viewer.renderFirstPage();
				break;
			case 33: // pageup
				viewer.renderPreviousPage();
				break;
			case 34: // pagedown
				viewer.renderNextPage();
				break;
			case 35: // end
				viewer.renderLastPage();
				break;
			case 43: //+
				viewer.zoomIn();
				break;
			case 45: //-
				viewer.zoomOut();
				break;
			case 48: //0
				zoomFit.click();
				break;
			case 37: // left
				if (event.altKey)
					viewer.rotateCounterClockWise();
				else
					prevent = false;
				break;
			case 39: // right
				if (event.altKey)
					viewer.rotateClockWise();
				else
					prevent = false;
				break;
		default:
			prevent = false;
		}
		if (prevent)
			event.preventDefault();
	});

	// Ouverture d'une URL
	$('#open-url-button').on('click', function() {
		var url = window.prompt('URL', '');
		if (url)
			load(undefined, url);
	});

	// Ouverture d'un fichier local
	$('#open-file-button,#pdf-start').on('click', function() {
		$('#open-file-input').click();
	});
	$('#open-file-input').on('change', function(event) {
		var files = this.files;
		if (files && files.length > 0)
			load(files[0]);
	});
	$('#pdf-start').on('dragenter dragover', function(event) {
		event.preventDefault();
	}).on('drop', function(event) {
		event.preventDefault();
		load(event.originalEvent.dataTransfer.files[0]);
	});
});