module.exports = function (grunt) {
	require('grunt-dojo2').initConfig(grunt, {
		copy: {
			staticExampleFiles: {
				expand: true,
				src: 'src/examples/**/*.html',
				dest: '<%= devDirectory %>'
			}
		},
		intern: {
			version: 4
		}
	});

	grunt.registerTask('dev', grunt.config.get('devTasks').concat([
		'copy:staticExampleFiles'
	]));
};
