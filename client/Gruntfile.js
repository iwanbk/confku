module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    concat : {
      dist: {
        src: ['EventEmitter.js', 'adapter.js', 'confku.js'],
        dest: 'dist/confku.dist.js'
      }
    },
    jshint: {
      options: {
        browser: true
      },
      all: ['rapat.js', 'confku.js']
    },
    uglify: {
      dist: {
        files: {
          'dist/confku.min.js': ['dist/confku.dist.js']
        }
      }
    }
  });

  // Load tasks from "grunt-sample" grunt plugin installed via Npm.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Default task.
  grunt.registerTask('lint', 'jshint');
  grunt.registerTask('default', ['jshint', 'concat', 'uglify'])

};
