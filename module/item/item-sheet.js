/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class SwordschroniclesItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["swordschronicles", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/swordschronicles/templates/item";
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.html`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.html`.
    return `${path}/item-${this.item.data.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Roll handlers, click handlers, etc. would go here.
        // Add Modifier
    html.find('.modifier-create').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this._addModifier(li);
    });
    html.find('.modifier-remove').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this._removeModifier(li);
      //li.slideUp(200,() => this.render(false));
    });

  }


async _addModifier(li){
	const itemId=li.data("itemId");
	console.log("add test",this);
	const item=this.object;
	//const item=this.actor.getOwnedItem(itemId);
	var data=item.data.data;
	var unused=0;
	while(unused in data.modifiers){
		unused+=1;
	}
	data.modifiers[unused]={name:"",effect: "",type: "flat",enabled:false,effecttype:"ability",target: "agility","special":"none"};
	await this.object.update({"data": data},{recursive: false,noHook: true, diff: false});

	}

async _removeModifier(li){
	const itemId=li.data("itemId");
	const targetIndex=li.data("index");
	var item=this.object;
	var data_test=duplicate(item.data.data);
	await delete data_test.modifiers[targetIndex];
	await this.object.update({"data": data_test},{recursive: false,noHook: true, diff: false});


	}

}
