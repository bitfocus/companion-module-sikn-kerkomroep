const { combineRgb } = require('@companion-module/base')

module.exports = async function (self) {
	self.setFeedbackDefinitions({
		ChannelState: {
			name: 'Live audio',
			type: 'boolean',
			label: 'Live audio',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					id: 'state',
					type: 'checkbox',
					label: 'Live?',
					default: 0,
					min: 0,
					max: 1,
				},
			],
			callback: (feedback) => {
				//self.log ('debug', 'feedback: '+feedback.options.state +' state: '+self.liveactiv)
				if (feedback.options.state == self.liveactiv ) {
					return true
				} else {
					return false
				}
			},
		},
	})
}
