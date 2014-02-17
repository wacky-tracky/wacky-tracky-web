window.host = "http://" + window.location.hostname + ":8082/"

function Task(taskObject) {
	var self = this;
	this.parent = null;
	this.fields = taskObject;

	this.dom = $('<div class = "taskWrapper" />')
	this.domTask = this.dom.createAppend('<div class = "task" />').text('Task: ' + this.fields.content);
	this.domTask.click(function() { self.setParentTask(); });
	this.domTask.dblclick(function() { self.openEditDialog(); });
	this.domTaskButtons = this.domTask.createAppend('<div class = "taskButtons" />');
	this.domButtonDelete = this.domTaskButtons.createAppend('<button>delete</button>');
	this.domButtonDelete.click(function() { self.del(); });
	this.domEditDialog = null;

	this.domSubtasks = this.dom.createAppend('<div class = "subTasks" />');

	this.subtasks = [];

	Task.prototype.openEditDialog = function() {
		this.domEditDialog = $('<div class = "editDialog" />');
		this.domEditId = this.domEditDialog.createAppend('<span />').text('ID:' + this.fields.id);

		this.dom.append(this.domEditDialog);
	};

	Task.prototype.closeEditDialog = function() {
		this.dom.children('.editDialog').remove();
		this.domEditDialog = null;
	}

	Task.prototype.addSubtask = function(t) {
		t.parent = this;
		this.domSubtasks.append(t.toDom());
		this.subtasks.push(t);
	};

	Task.prototype.toDom = function() {
		return this.dom;
	};

	Task.prototype.setParentTask = function() {
		if (window.selectItem !== null) {
			window.selectItem.deselect();
		}

		window.selectItem = this;
		this.dom.addClass('selected');
	};

	Task.prototype.deselect = function() {
		this.closeEditDialog();

		window.selectItem = null;
		this.dom.removeClass('selected');
	};

	Task.prototype.del = function(i) {
		$.ajax({
			url: window.host + '//deleteTask',
			data: { id: this.fields.id }
		});

		this.dom.remove();
		window.content.list.tasks.pop(this);
		window.content.list.updateTaskCount();
	};

	return this;
}

function init() {
	window.selectItem = null;

	window.sidebar = new Sidebar();
	$('body').append(window.sidebar.toDom());

	window.sidebar.refreshLists();

	window.content = new Content();
	$('body').append(window.content.toDom());

	sidebarResized();
}

function Content() {
	this.dom = $('<div id = "content" />');
	this.taskInput = new TaskInputBox();
	this.dom.append(this.taskInput.toDom());
	this.domListContainer = this.dom.createAppend('<div>');

	this.list = null;

	Content.prototype.toDom = function() {
		return this.dom;
	};

	Content.prototype.setList = function(list) {
		window.selectItem = null;

		this.list = list;
		this.domListContainer.children().remove();
		this.domListContainer.append(list.toDomContent());
		this.domListContainer.append(new ListControls(list).toDom());

		this.taskInput.enable();
	};

	return this;
}

function newTask(text) {
	$('input#task').val('');

	data = { content: text };
	
	if (window.selectItem === null) {
		data.parentId = window.content.list.fields.id;
		data.parentType = 'list';
	} else {
		data.parentId = window.selectItem.fields.id;
		data.parentType = 'task';
	}

	$.ajax({
		url: window.host + '//createTask',
		success: renderTaskCreated,
		data: data
	});
}

function renderTaskCreated(task) {
	window.content.list.add(task);
}

function TaskInputBox(label) {
	this.label = null;

	this.dom = $('<div />');
	this.domInput = this.dom.createAppend('<input id = "task" value = "" />');
	this.domInput.attr('disabled', 'disabled');
	this.domInput.model(this);
	this.domInput.keypress(function(e) {
		var key = e.keyCode ? e.keyCode : e.which;

		if (key == 13) {
			newTask($(this).val(), window.content.list.fields.id);
		}
	});

	TaskInputBox.prototype.toDom = function() {
		return this.dom;
	};

	TaskInputBox.prototype.enable = function() {
		this.domInput.removeAttr('disabled');
		this.domInput.focus();
	};

	return this;
}

$.fn.createAppend = function(constructor) {
	var childElement = $(constructor);

	$(this).append(childElement);

	return $(childElement);
};

$.fn.model = function() {
	if (typeof(this.data('model')) == "undefined") {
		this.data('model', {});
	}

	return this.data('model');
};

function renderTasks(list) {
	window.content.list.addAll(list);
}

function generalError(msg, errorText) {
	console.log("error", msg, errorText);
	$('body').createAppend($('<div class = "notification">').text('Error: ' + errorText)).click(function() {
		this.remove();	
	});
}

function requestTasks(list) {
	window.content.setList(list);

	$.ajax({
	url: window.host + '/listTasks',
		data: { list: list.fields.id },
		success: renderTasks,
		error: generalError
	});
}

function ListControls(list) {
	this.list = list;

	var self = this;

	this.dom = $('<div class = "buttonToolbar listControls" />')
	this.dom.model(this);
	this.domLabel = this.dom.createAppend('<span />').text(this.list.fields.title);
	this.domButtonDelete = this.dom.createAppend('<button />').text("Delete");
	this.domButtonDelete.click(function (e) { self.del(); });

	ListControls.prototype.del = function() {
		this.list.del();
	}

	ListControls.prototype.toDom = function() {
		return this.dom;
	}

	return this;
}

function List(jsonList) {
	this.fields = jsonList;

	this.domSidebar = $('<li class = "list" />');
	this.domSidebar.model(this);
	this.domSidebarTitle = this.domSidebar.createAppend('<a href = "#" class = "listTitle" />').text(this.fields.title);
	this.domSidebarTitleSuffix = this.domSidebarTitle.createAppend('<span class = "subtle" />');

	this.domList = $('<ul id = "taskList" />');

	this.tasks = [];

	var self = this;

	this.updateTaskCount = function(newCount = -1) {
		if (newCount == -1) {
			newCount = this.tasks.length;
		}

		this.domSidebarTitleSuffix.text(newCount);
	};

	this.domSidebarTitle.click(function(e) {
		requestTasks(self);

		window.sidebar.deselectAll();
		self.domSidebar.addClass('selected');
	});

	List.prototype.toDomSidebar = function () {
		return this.domSidebar;
	}; 

	List.prototype.toDomContent = function() {
		return this.domList;
	};

	List.prototype.addAll = function(tasks) {
		var self = this;

		this.clear();

		$(tasks).each(function(index, item) {	
			self.add(item);
		});
		
		self.updateTaskCount();
	};

	List.prototype.add = function(item) {
		task = new Task(item);

		this.tasks.push(task);
		this.domList.append(task.toDom());

		this.updateTaskCount();
	};

	List.prototype.deselect = function() {
		this.domSidebar.removeClass('selected');
	};

	List.prototype.clear = function() {
		this.domList.children().remove();
		this.tasks.length = 0;
	};

	this.updateTaskCount(this.fields.count);

	return this;
}

function sidebarResized() {
	window.content.dom.css('left', window.sidebar.dom.css('width'));
	window.content.dom.css('right', $('body').css('width'));
}

function Sidebar() {
	var self = this;

	this.dom = $('<div id = "sidebar" />');
	this.dom.model(this);
	this.dom.resizable({ minWidth: 200, handles: 'e', resize: sidebarResized});
	this.domTitle = this.dom.createAppend('<h2>WackyTracky</h2>');
	this.domLists = this.dom.createAppend('<ul class = "lists" />');
	this.domButtonNewList = this.dom.createAppend('<button>New...</button>').click(function() { self.createList(); });

	this.lists = [];

	Sidebar.prototype.createList = function() {
		var title = window.prompt("List name?");

		$.ajax({
			url: window.host + '/createList',
			data: {
				title: title
			},
			success: this.refreshLists
		});

	}

	Sidebar.prototype.addList = function(list) {
		this.domLists.append(list.toDomSidebar());
		this.lists.push(list);
	};

	Sidebar.prototype.toDom = function() {
		return this.dom;
	};

	Sidebar.prototype.clear = function() {
		this.domLists.children().remove();
		this.lists.length = 0;
	}

	Sidebar.prototype.deselectAll = function() {
		$(this.lists).each(function(index, list) {
			list.deselect();
		});
	};

	Sidebar.prototype.refreshLists = function() {
		$.ajax({
			url: window.host + '/listLists',
			success: this.renderLists
		})
	};

	Sidebar.prototype.renderLists = function(lists) {
		self.clear();

		$(lists).each(function(index, list) {
			self.addList(new List(list));
		});
	};

	return this;
}
