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
				console.log('Hello world!', feedback.options.num)
				if (feedback.options.state == 1) {
					return true
				} else {
					return false
				}
			},
		},
	})
}
