module.exports = function (self) {
	self.setActionDefinitions({
		sample_action: {
			name: 'Check Kerkomroep Live status',
			//options: [
			//	{
			//		id: 'state',
			//		type: 'number',
			//		label: 'Test',
			//		default: 0,
			//		min: 0,
			//		max: 100,
			//	},
			//],
			callback: async (event) => {
				self.getinfo(self)
				self.checkFeedbacks();
				console.log('Hello world!', event.options.num)
			},
		},
	})
}
