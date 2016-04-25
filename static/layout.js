;(function() {
  var ConfigProvider = {
    getDefaultConfig: function () {
      return {
        content: [{
          type: 'stack',
          content: [{
              type: 'component',
              title: 'bash',
              componentName: 'bash'
            }]
        }]
      };
    },
    getBlankPaneConfig: function () {
      return {
        type: 'component',
        title: 'bash',
        componentName: 'bash'
      };
    },
    getColumnConfig: function () {
      return {
        type: 'column',
          content:[]
      };
    },
    getRowConfig: function () {
      return {
        type: 'row',
        content:[]
      };
    }
  };

  var Layout = function (state, tty) {
    var self = this;

    if(state) {
      self.layout = new GoldenLayout(JSON.parse(state));
    } else {
      self.layout = new GoldenLayout(ConfigProvider.getDefaultConfig());
    }

    self.tty = tty;
  };

  Layout.prototype.watchStateChange = function () {
    var self = this;

    this.layout.on('stateChanged', function(){
      self.tty.socket.emit('layout state change', JSON.stringify(self.layout.toConfig()));
    });
  };

  Layout.prototype.registerComponents = function () {
    var tty = this.tty;

    this.layout.registerComponent('bash', function(container, componentState){
      var win = new tty.Window;

      win.on('open', function () {
        var tab = win.tabs[0];

        if ('term_id' in componentState) {
          win.restoreTab(componentState);
        } else {
          container.setState({
            'pty': tab.pty,
            'term_id': tab.id,
            'rows': win.rows,
            'cols': win.cols,
            'process': tab.process
          });
        }
      });

      container.getElement().get(0).appendChild(win.element);

      container.on('show', function () {
        setTimeout(tty.maximizeWindows, 200);
      });
      container.on('resize', function () {
        setTimeout(tty.maximizeWindows, 200);
      });
    });
  };

  Layout.prototype.manageControls = function () {
    var self = this;

    self.layout.on('stackCreated', function(stack){
      self._cleanControls(stack);

      if (stack.parent.isRoot) {
        // add "New Tab" control
        self._addNewTabBtn(stack);
      } else {
        self._addSplitVerticalBtn(stack);
        self._addSplitHorizontalBtn(stack);
      }
    });
  };

  Layout.prototype._cleanControls = function (stack) {
    stack.header.controlsContainer.find('.lm_popout').remove();
    stack.header.controlsContainer.find('.lm_maximise').remove();
    stack.header.controlsContainer.find('.lm_close').remove();
  }

  Layout.prototype._addNewTabBtn = function (stack) {
    var $addTabBtn = $('<li title="New Tab">+</li>');
    var self = this;

    stack.header.controlsContainer.prepend($addTabBtn);

    $addTabBtn.on('click', function () {
      self.newTab(stack);
    });
  };

  Layout.prototype._addSplitVerticalBtn = function (stack) {
    var $splitVerticalBtn = $('<li title="Split Vertical">v</li>');
    var self = this;

    stack.header.controlsContainer.prepend($splitVerticalBtn);

    $splitVerticalBtn.on('click', function () {
      self.splitVertical(stack);
    });
  };

  Layout.prototype._addSplitHorizontalBtn = function (stack) {
    var $splitHorizontalBtn = $('<li title="Split Horizontal">h</li>');
    var self = this;

    stack.header.controlsContainer.prepend($splitHorizontalBtn);

    $splitHorizontalBtn.on('click', function () {
      self.splitHorizontal(stack);
    });
  };

  Layout.prototype.newTab = function (stack) {
    stack.addChild(ConfigProvider.getBlankPaneConfig());
  };

  Layout.prototype.splitVertical = function (stack) {
    var parent = stack.parent;

    if (parent.isRow) {
      parent.addChild(ConfigProvider.getBlankPaneConfig(), this.getStackIndex(stack) + 1);
    } else {
      this._injectParent(stack, ConfigProvider.getRowConfig());
    }
  };

  Layout.prototype.splitHorizontal = function (stack) {
    var parent = stack.parent;

    if (parent.isColumn) {
      parent.addChild(ConfigProvider.getBlankPaneConfig(), this.getStackIndex(stack) + 1);
    } else {
      this._injectParent(stack, ConfigProvider.getColumnConfig());
    }
  };

  Layout.prototype._injectParent = function (stack, parentConfig) {
    var parent = stack.parent;
    var index = this.getStackIndex(stack);

    parent.addChild(parentConfig, index);
    parent.removeChild(stack, true);

    parent.contentItems[index].addChild(stack, 0);
    parent.contentItems[index].addChild(ConfigProvider.getBlankPaneConfig());
  };

  Layout.prototype.getStackIndex = function (stack) {
    var contentItems = stack.parent.contentItems;
    var i = 0;

    while (i < contentItems.length) {
      if (contentItems[i] == stack) {
        return i;
      }
      i++;
    }
  };

  Layout.prototype.init = function () {
    this.watchStateChange();
    this.registerComponents();
    this.manageControls();
    this.layout.init();
  };

  tty.on('load', function () {
    tty.socket.on('sync', function(state) {
      tty.reset();
      var layout = new Layout(state, tty);
      tty.maximizeWindows();
      layout.init();
    });
  });
}).call(function() {
    return this || (typeof window !== 'undefined' ? window : global);
  }());