window.host = "http://" + window.location.hostname + ":8082/";

function ajaxRequest(params) {
	if (typeof(params.error) != "function") {
		params.error = generalError
	}

	$.ajax({
		url: window.host + params.url,
		error: params.error,
		success: params.success,
		data: params.data,
		dataType: 'json',
		type: 'GET',
		xhrFields: {
			withCredentials: true,
		},
		crossDomain: true
	});
}

function Tag(tagObject) {
	var self = this;

	this.obj = tagObject;

	this.domSidePanel = $('<li class = "tagTitle tag' + this.obj.id + '">').text(this.obj.title);

	this.domDialog = $('<div />');
	this.domInputTitle = this.domDialog.createAppend('<p>').text('Title: ').createAppend('<input />').text(this.obj.title);
	this.domInputShortTitle = this.domDialog.createAppend('<p>').text('Short Title: ').createAppend('<input />').text(this.obj.shortTitle);
	this.domInputBackgroundColor = this.domDialog.createAppend('<p>').text('Background color: ').createAppend('<input />').val(this.obj.backgroundColor);

	Tag.prototype.toDomSidePanel = function() {
		return this.domSidePanel;
	};

	Tag.prototype.requestUpdate = function() {
		ajaxRequest({
			url: "/updateTag",
			data: {
				id: window.tag.obj.id,
				newTitle: window.tag.domInputTitle.val(),
				shortTitle: window.tag.domInputShortTitle.val(),
				backgroundColor: window.tag.domInputBackgroundColor.val()
			}
		});
	};

	Tag.prototype.showDialog = function() {
		window.tag = self;

		self.domInputTitle.val(self.obj.title);
		self.domInputShortTitle.val(self.obj.shortTitle);

		$(self.domDialog).dialog({
			title: 'Tag Options for ' + self.obj.title,
			close: self.requestUpdate
		});	
	};

	this.domSidePanel.rightClick(self.showDialog);

	return this;
}

function Task(taskObject) {
	var self = this;
	this.parent = null;
	this.fields = taskObject;

	this.dom = $('<div class = "taskWrapper" />');
	this.domTask = this.dom.createAppend('<div class = "task" />');
	this.domTask.click(function() { self.select(); });
	this.domTask.dblclick(function() { self.openEditDialog(); });
	this.domButtonExpand = this.domTask.createAppend('<button class = "expand" disabled = "disabled">&nbsp;</button>').click(function() { self.toggleSubtasks(); });
	this.domTaskContent = this.domTask.createAppend('<span class = "content" />').text(this.fields.content);
	this.domTaskControls = this.domTask.createAppend('<div class = "controls" />');
	this.domTaskButtons = this.domTaskControls.createAppend('<div class = "taskButtons" />');
	this.domButtonDueDate = this.domTaskButtons.createAppend('<input />').disable();
	this.domButtonDelete = this.domTaskButtons.createAppend('<button>delete</button>');
	this.domButtonDelete.click(function() { self.del(); });
	this.domButtonDelete.css('display', 'none');
	this.domButtonTags = this.domTaskButtons.createAppend('<button>Tag </button>');

	if (this.fields.url.length > 0) {
		  this.domTaskControls.createAppend('<img alt = "externalIcon" />').attr('src', "resources/images/icons/" + this.fields.icon)
		  this.domTaskLink = this.domTaskControls.createAppend('<a target = "_new" class = "externalItemUrl" />').attr('href', this.fields.url).text(this.fields.source);
	}

	this.menuTags = new Menu('tag menu');
	this.menuTags.domItems.addClass('tagsMenu');
	this.menuTags.dropDown = true;
	this.menuTags.addTo(this.domButtonTags);
	
	this.domEditDialog = null;
	
	this.domSubtasks = this.dom.createAppend('<div class = "subTasks" />');
	this.domSubtasks.css('display', 'none');

	this.subtasks = [];

	Task.prototype.isSubtasksVisible = function() {
		return this.domSubtasks.css('display') == 'block';
	};

	Task.prototype.setSubtasksVisible = function(visible) {
		if (visible) {
			this.refreshSubtasks();
			this.domSubtasks.css('display', 'block') ;
		} else {
			this.domSubtasks.css('display', 'none') ;
		}

		this.refreshExpandButton();
	};

	Task.prototype.toggleSubtasks = function() {
		this.setSubtasksVisible(!this.isSubtasksVisible());
	};

	Task.prototype.refreshExpandButton = function(forceEnabled) {
		if (forceEnabled || this.subtasks.length > 0) {
			if (this.isSubtasksVisible()) {
				this.domButtonExpand.text('-');
			} else {
				this.domButtonExpand.text('+');
			}

			this.domButtonExpand.removeAttr('disabled');
		} else {
			this.domButtonExpand.attr('disabled', 'disabled');
			this.domButtonExpand.html('&nbsp;');
		}
	};

	Task.prototype.refreshSubtasks = function() {
		this.domSubtasks.children().remove();
		ajaxRequest({
			url: '/listTasks',
			data: { 
				task: this.fields.id,
				sort: window.content.list.fields.sort
			},
			success: this.renderSubtasks
		});
	};

	Task.prototype.renderSubtasks = function(subtasks) {
		$(subtasks).each(function(i, t) {
			t = new Task(t);

			// TODO Change this to "this" or "self"
			window.selectedItem.addSubtask(t);
		});
	};

	Task.prototype.setDueDate = function(newDate) {
		if (newDate == null) {
			newDate = self.fields.dueDate;
		}

		if (newDate == null) {
			newDate = "";
		}

		if (newDate != "") {
			newDate = "Due: " + newDate;
		} else {
			newDate = "no due date"
		}

		self.domButtonDueDate.val(newDate);
	};

	Task.prototype.openEditDialog = function() {
		this.closeEditDialog();

		this.domEditDialog = $('<div class = "editDialog" />');
		this.domEditId = this.domEditDialog.createAppend('<span />').text('ID:' + this.fields.id);
	
		this.dom.append(this.domEditDialog).fadeIn();
		this.domEditDialog.slideDown();
	};

	Task.prototype.addTagButtons = function() {
		var self = this;

		$(window.sidepanel.tags).each(function(i, tag) {
			title = tag.obj.shortTitle;

			if (title == "" || title == null) {
				title = tag.obj.title;
			}

			self.menuTags.addItem(title, function() {
				self.tagItem(tag);
			}).addClass('tag' + tag.obj.id).addClass('tagTitle');
		});
	};

	Task.prototype.tagItem = function(tag) {
		ajaxRequest({
			url: '/tag',
			data: {
				item: this.fields.id,
				tag: tag.obj.id
			}
		});

		this.toggleTag(tag.obj);
	};

	Task.prototype.toggleTag = function(tag) {
		tagEl = this.menuTags.domItems.children('.tag' + tag.id);
		
		if (tagEl.hasClass('selected')) {
			tagEl.removeClass('selected');

			this.domButtonTags.children('.tag' + tag.id).remove();
		} else {
			tagEl.addClass('selected');

			this.domButtonTags.createAppend('<span class = "tag indicator tag' + tag.id + '">&nbsp;&nbsp;&nbsp;&nbsp;</span> ');
		}
	};

	Task.prototype.closeEditDialog = function() {
		this.dom.children('.editDialog').remove();
		this.domEditDialog = null;
	};

	Task.prototype.addSubtask = function(t) {
		t.parent = this;
		this.domSubtasks.append(t.toDom());
		this.subtasks.push(t);
		this.refreshExpandButton();
	};

	Task.prototype.toDom = function() {
		return this.dom;
	};

	Task.prototype.rename = function() {
		if (this.domTask.children('.renamer').length > 0) {
			this.domTask.children('.renamer').focus();
		} else {
			var self = this;
			
			this.isBeingRenamed = true;
			this.domTaskContent.text('');

			renamer = $('<input class = "renamer" />');
			renamer.val(this.fields.content);
			renamer.onEnter(function(el) {
				self.renameTo(el.val());
				el.remove();
			});

			this.domTask.append(renamer)
			renamer.focus();
		}
	};

	Task.prototype.renameTo = function(newContent) {
		this.isBeingRenamed = false;
		this.fields.content = newContent;
		this.domTaskContent.text(newContent);

		ajaxRequest({
			url: 'renameItem',
			data: {
				'id': this.fields.id,
				'content': newContent,
			}
		});
	};

	Task.prototype.select = function() {
		if (window.selectedItem == this || window.toDelete == this) {
			return;
		}

		if (window.selectedItem !== null) {
			if (!window.selectedItem.deselect()) {
			}
		}

		this.domButtonDelete.css('display', 'inline-block');
		this.domButtonTags.css('display', 'inline-block');
		this.domButtonDueDate.model(this);
		this.domButtonDueDate.datepicker({dateFormat: 'yy-mm-dd', onSelect: self.requestUpdateDueDate});
		this.domButtonDueDate.removeAttr('disabled');

		window.content.taskInput.setLabel(this.fields.content);

		window.selectedItem = this;
		this.dom.addClass('selected');
	};

	Task.prototype.requestUpdateDueDate = function(newDate) {
		ajaxRequest({
			url: 'setDueDate',
			data: {
				"item": window.selectedItem.fields.id,
				"dueDate": newDate
			}
		});
	};

	Task.prototype.deselect = function() {
		if (window.selectedItem.isBeingRenamed) {
			window.selectedItem.domTask.children('.renamer').focus().effect('highlight');
			return false;
		}

		this.closeEditDialog();

		window.selectedItem = null;
		this.dom.removeClass('selected');

		this.domButtonDueDate.attr('disabled', 'disabled');

		this.domButtonDelete.css('display', 'none');

		if (!this.hasTags()) {
			this.domButtonTags.css('display', 'none');
		}

		window.content.taskInput.setLabel('');

		this.domTask.children('.renamer').remove();
		this.menuTags.hide();
	};

	Task.prototype.del = function(i) {
		if (window.selectedItem.isBeingRenamed) {
			return;
		}

		window.selectedItem.deselect();

		window.toDelete = this;

		ajaxRequest({
			url: 'deleteTask',
			data: { id: this.fields.id },
			success: this.renderDelete
		});
	};

	Task.prototype.renderDelete = function() {
		window.toDelete.dom.remove();
		window.content.list.tasks.pop(window.toDelete);
		window.content.list.updateTaskCount();

		if (window.toDelete.parent != null) {
			if (window.toDelete instanceof Task) {
				parent = window.toDelete.parent;

				parent.subtasks.pop(window.toDelete);
				parent.refreshExpandButton();
			}
		}

		window.toDelete = null;
	};

	Task.prototype.hasTags = function() {
		// this should not rely on the dom, but when you toggleTag() we don't have the tag object to update this.tags with.
		return this.domButtonTags.children().size() > 0; 
	};

	if (this.fields.hasChildren) {
		this.refreshExpandButton(true);
	}

	this.setDueDate();
	this.addTagButtons();
	$(this.fields.tags).each(function(i, tag) {
		self.toggleTag(tag);
	});

	if (!this.hasTags()) {
		this.domButtonTags.css('display', 'none');
	}

	return this;
}

function LoginForm() {
	var self = this;

	this.loginForm = $('<div id = "loginForm" />');
	$('body').append(this.loginForm);

	this.loginForm.createAppend('<h2 />').text('wacky-tracky');

	usernameRow = this.loginForm.createAppend('<p />');
	usernameRow.createAppend('<label for = "username">Username</label>');
	usernameInput = usernameRow.createAppend('<input id = "username" />');

	passwordRow = this.loginForm.createAppend('<p />');
	passwordRow.createAppend('<label for = "password">Password</label>');
	passwordInput = passwordRow.createAppend('<input id = "password" type = "password" />');
	passwordInput.onEnter(function() {
		tryLogin(usernameInput.val(), passwordInput.val());	
	});

	emailRow = this.loginForm.createAppend('<p id = "emailRow" />');
	emailRow.createAppend('<label for = "email">Email</label>');
	emailInput = emailRow.createAppend('<input type = "email" />');
	emailInput.onEnter(function() {
		tryRegister(usernameInput.val(), passwordInput.val(), emailInput.val());
	});
	emailRow.css('display', 'none');

	actionsRow = this.loginForm.createAppend('<p id = "loginButtons" />');
	actionRegister = actionsRow.createAppend('<button id = "register">Register</button>');
	actionRegister.click(function() { self.toggleRegistration(); });
	actionForgotPassword = actionsRow.createAppend('<button id = "forgotPassword">Forgot password</button>');
	actionForgotPassword.click(function() { window.alert("Aww. Not much I can do about that."); });
	actionsRow.createAppend('<button id = "login">Login</button>').click(function() { 
		if (emailRow.css('display') !== 'block') {
			tryLogin(usernameInput.val(), passwordInput.val(), emailInput.val()); 
		} else {
			tryRegister(usernameInput.val(), passwordInput.val(), emailInput.val());
		}
	});

	LoginForm.prototype.isShown = function() {
		return $('body').children('#loginForm').length > 0;
	};

	LoginForm.prototype.toggleRegistration = function() {
		if (!this.isShown()) {
			return;
		}

		if (this.isRegistrationShown()) {
			$('#emailRow').css('display', 'none');
			$('button#register').text('Register');
			$('button#forgotPassword').removeAttr('disabled');
			$('button#login').text('Login');
		} else {
			$('#emailRow').fadeIn();
			$('button#register').text('Cancel');
			$('button#forgotPassword').attr('disabled', 'disabled');
			$('button#login').text('Register');
		}
	};

	LoginForm.prototype.isRegistrationShown = function() {
		return $('#emailRow').css('display') == 'block';
	}

	LoginForm.prototype.hideRegistration = function() {
		if (this.isRegistrationShown()) {
			this.toggleRegistration();
		}

		$('input#password').focus();
		$('button#login').effect('highlight');
	};

	LoginForm.prototype.show = function() {
		$('body').css('display', 'block');

		this.loginForm.show();
	};

	LoginForm.prototype.hide = function() {
		this.loginForm.hide();
	};

	return this;
}

function registerSuccess() {
	notification('good', 'Thanks for registering, you can now login!');

	window.loginForm.hideRegistration();
	window.content.remove();
}

function tryRegister(username, password, email) {
	hashedPassword = CryptoJS.SHA1(password).toString();

	ajaxRequest({
		url: 'register',
		error: registerFail,
		success: registerSuccess,
		data: {
			username: username,
			password: hashedPassword,
			email: email,
		}
	});
}

function registerFail(req, dat) {
	clearValidationFailures();

	if (typeof(req.responseJSON.uniqueType) != "undefined") {
		switch(req.responseJSON.uniqueType) {
			case "username-too-short":
				highlightValidationFailure("#username", "Your username is too short.");
				return
			case "username-already-exists": 
				highlightValidationFailure("#username", "Your username has been taken.");
				return
			case "username-invalid": 
				highlightValidationFailure("#username", "Your username has some odd characters.");
				return

		}
	}

	generalErrorJson("Register fail. ", req, dat)
}

function tryLogin(username, password) {
	hashedPassword = CryptoJS.SHA1(password).toString();

	$('#loginForm input, #loginForm button').disable();

	ajaxRequest({
		url: 'authenticate',
		error: loginFail,
		success: loginSuccess,
		data: {
			username: username,
			password: hashedPassword,
		}
	});
}

function generalErrorJson(msg, res) {
	msg = "General JSON Error.";

	if (typeof(res.responseJSON) !== "undefined") {
		msg += ": " + res.responseJSON.message;
	}

	generalError(msg);
}

function loginFail(res, dat) {
	$('#loginForm input, #loginForm button').enable();

	clearValidationFailures();

	switch (res.responseJSON.uniqueType) {
		case "user-not-found":
			highlightValidationFailure("#username", "Username not found");
			return
		case "user-wrong-password":
			highlightValidationFailure("#password", "Incorrect pasword.");
			return
	}
	generalErrorJson("Login Failure. ", res);
}

function loginSuccess() {
	hideAllErrors();

	window.loginForm.hide();
	$('body').createAppend('<div id = "layout" />');
	
	window.sidepanel = new SidePanel();
	$('div#layout').append(window.sidepanel.toDom());

	window.sidepanel.refreshLists();
	window.sidepanel.refreshTags();

	window.sidepanelIcon = new SidePanelIcon();
	window.content = new Content();
	$('div#layout').append(window.content.toDom());

	sidepanelResized();
}

function initSuccess(res) {
	if (res.wallpaper !== null) {
		img = "url(/wallpapers/" + res.wallpaper + ")";
		$('body').css('background-image', img);
	}

	window.loginForm = new LoginForm();

	if (res.username !== null) {
		loginSuccess();
	} else {
		window.loginForm.show();
	}
}

function initFailure(a, b, c) {
	generalError("Could not init. Is the server running?");
}

function init() {
	window.selectedItem = null;

	ajaxRequest({
		url: 'init',
		error: initFailure,
		success: initSuccess,
		dataType: 'json',
		type: 'GET',
		xhrFields: {
			withCredentials: true,
		},
		crossDomain: true
	});
}

function Content() {
	this.dom = $('<div id = "content" />');
	this.taskInput = new TaskInputBox();
	this.dom.append(this.taskInput.toDom());
	this.domListContainer = this.dom.createAppend('<div id = "listContainer">');

	this.list = null;

	Content.prototype.toDom = function() {
		return this.dom;
	};

	Content.prototype.setList = function(list) {
		window.selectedItem = null;

		this.list = list;
		this.domListContainer.children().remove();
		$('.tagsMenu').remove();
		$('.listControlsMenu').remove();
		this.domListContainer.append(list.toDomContent());
		this.domListContainer.append(new ListControls(list).toDom());

		this.taskInput.enable();
	};

	Content.prototype.hide = function() {
		this.dom.hide();
	};

	Content.prototype.show = function() {
		this.dom.show();
	};

	return this;
}

function newTask(text) {
	if ($.isEmptyObject(text)) {
		return;
	}

	$('input#task').val('');

	data = { content: text };

	if (window.selectedItem === null) {
		data.parentId = window.content.list.fields.id;
		data.parentType = 'list';
	} else {
		data.parentId = window.selectedItem.fields.id;
		data.parentType = 'task';
	}

	ajaxRequest({
		url: 'createTask',
		success: renderTaskCreated,
		data: data
	});
}

function renderTaskCreated(task) {
	if (window.selectedItem === null) {
		window.content.list.add(new Task(task));
	} else {
		window.selectedItem.addSubtask(new Task(task));

		if (!window.selectedItem.isSubtasksVisible()) {
			window.selectedItem.toggleSubtasks();
		}
	}
}

function TaskInputBox(label) {
	this.label = null;

	this.dom = $('<div class = "itemInput" />');
	this.domLabel = this.dom.createAppend('<span />');
	this.domSidepanelIcon = this.dom.createAppend(window.sidepanelIcon.dom);
	this.domInput = this.dom.createAppend('<input id = "task" value = "" />');
	this.domInput.attr('disabled', 'disabled');
	this.domInput.model(this);
	this.domInput.keypress(function(e) {
		var key = e.keyCode ? e.keyCode : e.which;

		if (key == 13) {
			newTask($(this).val(), window.content.list.fields.id);
		}
	});

	this.domInput.focus(function() {
		$(this).val('');
	});

	this.domInput.blur(function() {
		$(this).val(self.label);
	});

	TaskInputBox.prototype.toDom = function() {
		return this.dom;
	};

	TaskInputBox.prototype.enable = function() {
		this.domInput.removeAttr('disabled');
		this.domInput.focus();
	};
	
	TaskInputBox.prototype.setLabel = function(label) {
		if ($.isEmptyObject(label)) {
			this.label = "";
		} else {
			this.label = "Click to add subtask of: " + label;
		}

		this.domInput.val(this.label);
	};

	return this;
}

function renderTasks(list) {
	window.content.list.addAll(list);
}

function generalError(error) {
	console.log("generalError() = ", error);
	console.log("generalError() stack: ", new Error().stack);

	if (error.status == 403 && error.responseJSON.message == "Login required.") {
		logoutSuccess("expired");
	} else if (error.status == 500) {
		error = "Internal Server Error.";
	} else if (error.statusText == "error") {
		error = "Critical, unspecified client side error."
	} else if (typeof(error.responseJSON) != "undefined" && typeof(error.responseJSON.message) != "undefined") {
		error = error.responseJSON.message
	} else if (typeof(error) == "object") {
		error = error.toString()
	}

	notification('error', 'Error: ' + error);
}

function notification(cls, text) {
	$('body').createAppend($('<div class = "notification ' + cls + '">').text(text)).click(function() {
		this.remove();	
	});
}

function hideAllErrors() {
	$('body').children('.notification').remove();
}

function requestTasks(list) {
	window.content.setList(list);

	ajaxRequest({
		url: 'listTasks',
		data: { 
			list: list.fields.id,
			sort: list.fields.sort,
		},
		success: renderTasks,
		error: generalError
	});
}

function ListControls(list) {
	this.list = list;

	var self = this;

	this.dom = $('<div class = "buttonToolbar listControls" />');
	this.dom.model(this);
	this.domLabel = this.dom.createAppend('<span />').text(this.list.fields.title);
	this.domButtonDelete = this.dom.createAppend('<button />').text("Delete");
	this.domButtonDelete.click(function (e) { self.del(); });

	this.domButtonSettings = this.dom.createAppend('<button />').text('Settings');
	this.domButtonSettings.click(function (e) { self.showSettings(); });

	this.domButtonMore = this.dom.createAppend('<button />').text('^');
	
	ListControls.prototype.requestDownloadJson = function() {
		window.location = window.host + 'listDownload?id=' + self.list.fields.id + '&format=json'
	};

	ListControls.prototype.requestDownloadText = function() {
		window.location = window.host + 'listDownload?id=' + self.list.fields.id + '&format=text'
	};


	ListControls.prototype.del = function() {
		this.list.del();
	};

	ListControls.prototype.toDom = function() {
		return this.dom;
	};

	ListControls.prototype.showSettings = function() {
		this.list.openDialog();
	};

	this.menuMore = new Menu();
	this.menuMore.domItems.addClass('listControlsMenu');
	this.menuMore.dropDown = true;
	this.menuMore.addItem('Download (JSON)', this.requestDownloadJson);
	this.menuMore.addItem('Download (Text)', this.requestDownloadText);
	this.menuMore.addTo(this.domButtonMore);

	return this;
}

function List(jsonList) {
	this.fields = jsonList;

	this.domSidePanel = $('<li class = "list" />');
	this.domSidePanel.model(this);
	this.domSidePanelTitle = this.domSidePanel.createAppend('<a href = "#" class = "listTitle" />')
	this.domSidePanelTitleText = this.domSidePanelTitle.createAppend('<span class = "listCaption" />').text(this.fields.title);
	this.domSidePanelTitleSuffix = this.domSidePanelTitle.createAppend('<span class = "subtle" />');

	this.domDialog = $('<p><small>Note: your changes will be automatically saved when you close this dialog.</small></p>');
	this.domInputTitle = this.domDialog.createAppend('<p>Title:</p>').createAppend('<input />').text(this.fields.title);
	this.domInputSort = this.domDialog.createAppend('<p>Sort:</p>').createAppend('<select />');
	this.domInputSort.createAppend('<option value = "title">Title</option>');
	this.domInputSort.createAppend('<option value = "dueDate">Due Date</option>');

	this.domShowTimeline = this.domDialog.createAppend('<p>Timeline:</p>').createAppend('<input type = "checkbox" />');

	this.domList = $('<ul id = "taskList" class = "foo" />');

	this.tasks = [];

	var self = this;

	List.prototype.openDialog = function() {
		var self = this;

		this.domInputTitle.val(this.fields.title);
		this.domInputSort.val(this.fields.sort);
		this.domShowTimeline.val(this.fields.timeline);

		this.domDialog.dialog({
			title: "List options",
			close: function() {
				ajaxRequest({
					url: 'listUpdate',
					data: {
						list: self.fields.id,
						title: self.domInputTitle.val(),
						sort: self.domInputSort.val(),
						timeline: self.domShowTimeline.val(),
					}
				});
			}
		});
	};

	this.updateTaskCount = function(newCount) {
		if (newCount === null) {
			newCount = this.tasks.length;
		}

		this.domSidePanelTitleSuffix.text(newCount);
	};

	this.domSidePanelTitle.click(function(e) {
		self.select();
	});

	List.prototype.select = function() {
		requestTasks(this);

		window.sidepanel.deselectAll();
		this.domSidePanel.addClass('selected');
	};

	List.prototype.toDomSidePanel = function () {
		return this.domSidePanel;
	}; 

	List.prototype.toDomContent = function() {
		return this.domList;
	};

	List.prototype.addAll = function(tasks) {
		var self = this;

		this.clear();

		$(tasks).each(function(index, item) {	
			self.add(new Task(item));
		});
		
		self.updateTaskCount();
	};

	List.prototype.add = function(task) {
		task.parent = this;
		this.tasks.push(task);
		this.domList.append(task.toDom());

		this.updateTaskCount();
	};

	List.prototype.deselect = function() {
		this.domSidePanel.removeClass('selected');
	};

	List.prototype.itemOffset = function(offset) {
		selectedItemIndex = -1;

		$(this.tasks).each(function(index, item) {
			if (item == window.selectedItem) {
				selectedItemIndex = index;
				return;
			}
		});

		if (selectedItemIndex != -1) {
			return this.tasks[selectedItemIndex + offset]
		} else {
			return null;
		}
	};

	List.prototype.clear = function() {
		this.domList.children().remove();
		this.tasks.length = 0;
	};

	List.prototype.del = function() {	
		ajaxRequest({
			url: 'deleteList',
			data: { id: this.fields.id },
			success: window.sidepanel.refreshLists
		});
	};

	this.updateTaskCount(this.fields.count);

	return this;
}

function selectByOffset(offset, currentItem) {
	if (currentItem == null) {
		if (window.selectedItem == null) {
			return;
		} else {
			currentItem = window.selectedItem;
		}
	}

	console.log("ci", currentItem);

	if (currentItem.parent instanceof Task) {
		parentTask = currentItem.parent;

		currentOffset = parentTask.subtasks.indexOf(currentItem);

		if (currentOffset != -1) {
			targetOffset = currentOffset + offset;
			targetTask = parentTask.subtasks[targetOffset];

			if (targetTask != null) {
				targetTask.select();
			} else if (targetOffset >= parentTask.subtasks.length) {
				console.log("foo");
				nextIndex = parentTask.subtasks.indexOf(currentItem) + 1
				selectByOffset(nextIndex, parentTask.parent)
			}
		}
	} else if (currentItem instanceof List) {
		parentList = currentItem;

		currentOffset = parentList.tasks.indexOf(currentItem);

		if (currentOffset != -1) {
			targetOffset = currentOffset + offset;
			targetTask = parentList.tasks[targetOffset];

			if (targetTask != null) {
				targetTask.select();
			}
		}
	}
}

function sidepanelResized() {
}

function clearValidationFailures() {
	$('p.validationError').remove();
	$('input.validationError').removeClass('validationError');
}

function highlightValidationFailure(selector, message) {
	element = $(selector)

	element.addClass('validationError');

	element.parent().children('p.validationError').remove();
	element.parent().append($('<p class = "validationError">').text(message));

}

function logoutRequest() {
	ajaxRequest({
		url: "logout",
		success: logoutSuccess
	});
}

function logoutSuccess(reason) {
	if (reason == "expired") {
		window.alert("Your login session has expired. Please login again...")
	}

	location.reload();
}

function changePasswordSuccess() {
	notification('good', 'Your password has been changed!');
}

function promptChangePassword() {
	password1 = window.prompt("New password");
	password2 = window.prompt("Newpassword (again)");

	if (password1 == password2) {
		changePassword(password1);
	} else {
		generalError('Passwords do not match!');
	}
}

function changePassword(password) {
	hashedPassword = CryptoJS.SHA1(password).toString();

	ajaxRequest({
		url: 'changePassword',
		data: {
			'hashedPassword': hashedPassword
		},
		success: changePasswordSuccess
	});
}

function SidePanelIcon() {
	var self = this;

	this.dom = $('<button id = "sidepanelIcon">wt</button>');

	this.dom.click(function() {
		window.sidepanel.toggle();
	});

	SidePanelIcon.prototype.setVisible = function(isVisible) {
		if (isVisible) {
			display = 'inline-block';
		} else {
			display = 'none';
		}

		this.dom.css('display', display);
	};

	return self;
}

function SidePanel() {
	var self = this;

	this.dom = $('<div id = "sidepanel" />');
	this.dom.model(this);
	this.dom.resizable({ minWidth: 200, handles: 'e', resize: sidepanelResized});
	this.domTitle = this.dom.createAppend('<h2>wacky-tracky</h2>');
	this.domLists = this.dom.createAppend('<ul class = "lists" />');
	this.domTags = this.dom.createAppend('<ul class = "tags" />');
	this.domButtonNewList = this.dom.createAppend('<button>New List</button>').click(function() { self.createList(); });
	this.domButtonNewTag = this.dom.createAppend('<button>New Tag</button>').click(function() { self.createTag(); });
	this.domButtonRefresh = this.dom.createAppend('<button class = "refresh" />').html('&nbsp;').click(function() { self.refreshLists(); })
	this.domButtonRaiseIssue = this.dom.createAppend('<button id = "raiseIssue">Issue!</button>').click(function() { window.open("http://github.com/wacky-tracky/wacky-tracky-client-html5/issues/new") });
	this.domButtonRaiseIssue.css('color', 'darkred').css('font-weight', 'bold');

	this.lists = [];
	this.tags = [];

	SidePanel.prototype.toggle = function() {
		isVisible = $('div#sidepanel').css('display') == 'block';

		if (isVisible) {
			$('div#sidepanel').css('display', 'none');
			sidepanelResized();
		} else {
			$('div#sidepanel').css('display', 'inline-block');
			sidepanelResized();
		}

		window.sidepanelIcon.setVisible(isVisible)
	};

	SidePanel.prototype.createTag = function() {
		var title = window.prompt("Tag name?");

		if ($.isEmptyObject(title)) {
			return;
		}

		ajaxRequest({
			url: 'createTag',
			data: {
				title: title
			},
			success: this.refreshTags
		});
	};

	SidePanel.prototype.createList = function() {
		var title = window.prompt("List name?");

		if ($.isEmptyObject(title)) {
			return;
		}

		ajaxRequest({
			url: 'createList',
			data: {
				title: title
			},
			success: this.refreshLists
		});

	};

	SidePanel.prototype.addList = function(list) {
		this.domLists.append(list.toDomSidePanel());
		this.lists.push(list);
	};

	SidePanel.prototype.addTag = function(tag) {
		this.domTags.append(tag.toDomSidePanel());
		this.tags.push(tag);
	};

	SidePanel.prototype.toDom = function() {
		return this.dom;
	};

	SidePanel.prototype.clear = function() {
		this.domLists.children().remove();
		this.lists.length = 0;
	};

	SidePanel.prototype.deselectAll = function() {
		$(this.lists).each(function(index, list) {
			list.deselect();
		});
	};

	SidePanel.prototype.refreshLists = function() {
		ajaxRequest({
			url: 'listLists',
			success: self.renderLists,
			dataType: 'json',
			type: 'GET',
			xhrFields: {
				withCredentials: true,
			},
			crossDomain: true
		});
	};

	SidePanel.prototype.refreshTags = function() {
		ajaxRequest({
			url: 'listTags',
			success: this.renderTags
		});
	};

	SidePanel.prototype.renderTags = function(tags) {
		ret = "";

		$(tags).each(function(index, tag) {
			ret += '.tag' + tag.id + '.tagTitle { border-left: 4px solid ' + tag.backgroundColor + ' !important }' + "\n";
			ret += '.tag' + tag.id + '.indicator { background-color:' + tag.backgroundColor + ' !important }' + "\n";
			self.addTag(new Tag(tag));
		});

		$('body').append($('<style type = "text/css">' + ret + '</style>'));
		sidepanelResized();
	};

	SidePanel.prototype.renderLists = function(lists) {
		self.clear();

		$(lists).each(function(index, list) {
			self.addList(new List(list));
		});

		sidepanelResized();

		if (self.lists.length > 0) {
			self.lists[0].select();
		}
	};

	SidePanel.prototype.hide = function() {
		this.dom.hide();
	};

	menuUser = new Menu('User Menu');
	menuUser.addItem('Toggle', this.toggle);
	menuUser.addItem('Change password', promptChangePassword);
	menuUser.addItem('Logout', logoutRequest);
	menuUser.addTo(this.domTitle);

	return this;
}

KeyCodes = {}
KeyCodes.ESC = 27;
KeyCodes.DEL = 46;
KeyCodes.F2 = 113;
KeyCodes.UP = 38;
KeyCodes.DOWN = 40;
KeyCodes.RIGHT = 39;
KeyCodes.LEFT = 37;
KeyCodes.SPACE = 32;
KeyCodes.T = 84;

$(document).keyup(function(e) {
	if (e.altKey) {
		if (e.keyCode == KeyCodes.T) {
			window.sidepanel.toggle();
		}
	}

	if (window.selectedItem !== null) {
		if (e.keyCode == KeyCodes.ESC) {
			window.selectedItem.deselect();
		}

		if (e.keyCode == KeyCodes.DEL) {
			window.selectedItem.del();
		}

		if (e.keyCode == KeyCodes.F2) {
				window.selectedItem.rename();
		}

		if (e.keyCode == KeyCodes.DOWN) {
			selectByOffset(+1);
		}

		if (e.keyCode == KeyCodes.UP) {
			selectByOffset(-1);
		}

		if (e.keyCode == KeyCodes.RIGHT) {
			window.selectedItem.setSubtasksVisible(true);
		}

		if (e.keyCode == KeyCodes.LEFT) {
			window.selectedItem.setSubtasksVisible(false);
		}

		if (e.keyCode == KeyCodes.SPACE) {
			if (document.activeElement.type != "text") {
				window.selectedItem.toggleSubtasks();
			}
		}
	}

	if (window.currentMenu != null) {
		if (e.keyCode == 27) {
			window.currentMenu.hide();
		}
	}

});
