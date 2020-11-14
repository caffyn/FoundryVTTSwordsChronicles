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
	const item=this.actor.getOwnedItem(itemId);
	var modifiers=item.data.data.modifiers;
	var unused=0;
	while(unused in modifiers){
		unused+=1;
	}
	console.log("existing mods when adding",modifiers);
	modifiers[unused]={name:"",effect: "",type: "flat",enabled:false,targettype:"ability",target: "agility","special":"none"};
	item.update({"data.modifiers": modifiers},{});

	}

async _removeModifier(li){
	const itemId=li.data("itemId");
	const targetIndex=li.data("index");
	var item=this.actor.getOwnedItem(itemId);
	var modifiers=duplicate(item.data.data.modifiers);
	delete modifiers[targetIndex];
	item.update({"data.modifiers": modifiers},{recursive: false,noHook: true, diff: false});

	}

}
