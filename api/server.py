#!/usr/bin/python

import cherrypy
import wrapper
import json

jsonContentType = [('Content-Type', 'application/json')]

class Api(object):
	wrapper = wrapper.Wrapper()

	@cherrypy.expose
	def default(self, *args, **kwargs):
		return "Index"

	def outputJson(self, structure):
		cherrypy.response.headers['Content-Type'] = 'application/json'

		return json.dumps(structure);

	@cherrypy.expose
	def listLists(self, *path, **args):
		lists = self.wrapper.getLists();

		ret = []

		for row in lists:
			singleList = row[0]

			ret.append({
				"id": singleList.id,
				"title": singleList['title']
			})

		return self.outputJson(ret)

	@cherrypy.expose
	def createList(self, *path, **args):
		self.wrapper.createList(args["title"]);

	@cherrypy.expose
	def createTask(self, *path, **args):
		if (args['parentType'] == "list"):
			self.wrapper.createListItem(int(args['parentId']), args['content'])
		else:
			self.wrapper.createSubItem(int(args['parentId']), args['content'])

		return "{'message': 'created'}"

	@cherrypy.expose
	def listTasks(self, *path, **args):
		items = self.wrapper.getItemsFromList(int(args['list']))

		ret = []
		for row in items: 
			singleItem = row[0]

			ret.append({
				"id": singleItem.id,
				"content": singleItem['content']
			})

		return self.outputJson(ret);
	

def CORS():
	print "before finalize"
	cherrypy.response.headers['Access-Control-Allow-Origin'] = "*"

api = Api();
api.wrapper.username = "auser"

cherrypy.config.update({
	'server.socket_host': '0.0.0.0',
	'server.socket_port': 8082,
	'tools.CORS.on': True
});
cherrypy.tools.CORS = cherrypy.Tool('before_finalize', CORS);
cherrypy.quickstart(api)