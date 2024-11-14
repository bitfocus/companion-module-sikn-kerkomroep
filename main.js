const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')
const xml2js = require('xml2js')

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	async init(config) {
		this.config = config
		this.log('debug', 'init')
		this.getinfo(this) // connect to kerkomroep
		this.updateStatus(InstanceStatus.Ok)
		this.liveactiv = false
		this.churchname = ''

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
	}
	// When module gets deleted
	async destroy() {
		this.log('debug', 'destroy')
	}
	getinfo(self) {
		if (self.config.mountpoint > 0) {
			var lbody =
				'<?xml version="1.0" encoding="UTF-8"?><ko><request><command>getkerkinfo</command><arguments><argument><name>id</name><value>' +
				self.config.mountpoint +
				'</value></argument></arguments></request></ko>'
			self.log('debug', 'request: ' + lbody)
			var response
			var responseData
			var err
			var https = require('https')
			const options = {
				host: 'www.kerkomroep.nl',
				path: '/xml/index.php',
				method: 'POST',
				body: lbody,
				headers: { 'Content-Type': 'application/xml', 'Content-Length': Buffer.byteLength(lbody) },
			}
			const req = https.request(options, (res) => {
				let responseData = ''

				// A chunk of data has been received.
				res.on('data', (chunk) => {
					responseData += chunk
				})

				// The whole response has been received.
				res.on('end', () => {
					self.log('debug', 'Response:' + responseData)
					try {
						xml2js.parseString(responseData, (err, response) => {
							if (err) {
								self.log('debug', 'xmlparse error: ' + err)
							}
							self.log('debug', 'responseobject audio: ' + response.ko.response[0].kerkinfo[0].audio_aktief)

							self.liveactiv = response.ko.response[0].kerkinfo[0].audio_aktief
							self.churchname = response.ko.response[0].kerkinfo[0].naam
							self.log('debug', 'responseobject systemvar: ' + self.liveactiv)

							self.setVariableValues({ LiveAudioState: self.liveactiv })
							self.setVariableValues({ Churchname: self.churchname })
							self.checkFeedbacks()
						})
					} catch (error) {
						self.log ('debug','xmlparse error catch:'+error)
					}
				})
			})

			// Handle errors
			req.on('error', (error) => {
				self.log('debug', 'Error:' + error.message)
			})

			// Send the POST data
			req.write(lbody)
			req.end()
		}
	}

	async configUpdated(config) {
		this.config = config
		this.getinfo(this)
	}

	// Return config fields for web config
	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'mountpoint',
				label: 'ChurchID (last number in kerkomroep url of your church)',
				width: 8,
				regex: Regex.NUMBER,
			},
			{
				type: 'textinput',
				id: 'freq',
				label: 'check frequency (in seconds)',
				width: 4,
				regex: Regex.NUMBER,
			},
		]
	}

	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
