/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class SwordschroniclesActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["swordschronicles", "sheet", "actor"],
      template: "systems/swordschronicles/templates/actor/actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];
    console.log("what now",data);
    for (let attr of Object.values(data.data.attributes)) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }

    // Prepare items.
    if (this.actor.data.type == 'character' || this.actor.data.type == 'unit') {
      this._prepareCharacterItems(data);
    }

    return data;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems(sheetData) {
    const actorData = sheetData.actor;

    // Initialize containers.
    const gear = [];
    const features = [];
    const modifiers=[];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: []
    };
    const weapon=[];
	 //Initial health and composure calcs
    actorData.data.health.max=(actorData.data.abilities.endurance.value * 3);
    if(actorData.type == 'character'){
	    actorData.data.composure.max=(actorData.data.abilities.will.value * 3);
	    }

	    // Iterate through items, allocating to containers
	    // let totalWeight = 0;
	    for (let i of sheetData.items) {
	      let item = i.data;
	      i.img = i.img || DEFAULT_TOKEN;
	      // Append to gear.
	      if (i.type === 'item') {
		gear.push(i);
	      }
	      // Append to features.
	      else if (i.type === 'feature') {
		features.push(i);
		console.log("item found",i);
		for(let j in i.data.modifiers){
			let currentmod=i.data.modifiers[j];
			//Dropdown switch can lead to invalid conditions. Fixing here, this is probably a temp fix
			if(currentmod.effecttype=="other" &&  !(currentmod.target in {'health':0,'composure':0,'initiative':0,'socialinitiative':0})){
				console.log("debug: fixing invalid typing",currentmod);
				i.data.modifiers[j].target='health';
				currentmod=i.data.modifiers[j];
			}else if(currentmod.effecttype!="other" &&  (currentmod.target in {'health':0,'composure':0,'initiative':0,'socialinitiative':0})){
				console.log("debug: fixing invalid typing",currentmod);
				i.data.modifiers[j].target='agility';
				currentmod=i.data.modifiers[j];
			}
			modifiers.push(currentmod);
			//Now, to apply health and composure bonuses
			if(currentmod.effecttype=="other" && currentmod.target=='health'){
				//Compute and add health bonus
				try{
				var change=new Roll(currentmod.effect,actorData.data).roll().total;
				actorData.data.health.max+=change;
				}catch(error){
					console.log("formula error",currentmod.effect,actorData);
				}
			}
			if(currentmod.effecttype=="other" && currentmod.target=='composure'){
				//Compute and add composure bonus
				try{
				var change=new Roll(currentmod.effect,actorData.data).roll().total;
				actorData.data.composure.max+=change;
				}catch(error){
					console.log("formula error",currentmod.effect,actorData);
				}
			}

		}
	      }
	      // Append to spells.
	      else if (i.type === 'spell') {
		if (i.data.spellLevel != undefined) {
		  spells[i.data.spellLevel].push(i);
		}
	      }
	      else if(i.type === 'weapon'){
		weapon.push(i);
	      }
	    }


	    //Health and composure final calcs

	    if(actorData.data.health.value > actorData.data.health.max){
	   actorData.data.health.value=actorData.data.health.max; 
    }
    if(actorData.type == 'character' && actorData.data.composure.value > actorData.data.composure.max){
	   actorData.data.composure.value=actorData.data.composure.max; 
    }
    actorData.data.combat.defense=actorData.data.abilities.agility.value+actorData.data.abilities.athletics.value+actorData.data.abilities.awareness.value+actorData.data.combat.defensebonus;
    actorData.data.socialcombat.defense=actorData.data.abilities.awareness.value+actorData.data.abilities.cunning.value+actorData.data.abilities.status.value+actorData.data.socialcombat.defensebonus;

    // Assign and return
    actorData.gear = gear;
    actorData.features = features;
    actorData.modifiers = modifiers;
    actorData.spells = spells;
    actorData.weapon = weapon;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Rollable abilities.
    html.find('.rollable').click(this._promptRoll.bind(this));
    

    // Drag events for macros.
    if (this.actor.owner) {
      let handler = ev => this._onDragItemStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }


  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return this.actor.createOwnedItem(itemData);
  }
 async _promptRoll(event){
	event.preventDefault();
	const element = event.currentTarget;
	const dataset = element.dataset;
	var hasstunt;
	if(this.actor.data.data.config.usestunts == "yes"){
		hasstunt=true;
	}else{
		hasstunt=false;
	}
	const rolltype=dataset.category;
	var chartype=this.actor.data.type;
	let template = "systems/swordschronicles/templates/roll.html";
	let params={"stunts": hasstunt,"type": rolltype,"chartype":chartype};
	var html=await renderTemplate(template,params);
	var title=dataset.flavor;
	let d = new Dialog({
		title: title,
		content: html,
	  	buttons: {roll:{label:"Roll",
			callback: html =>  this._performRoll(html,dataset)}}
	});
	d.render(true);

  }

_performRoll(html,dataset){
	const data=this.actor.data.data;
    var test=html.find('[name="stunt"]');
	var stunt="0";
	for(let elem of test){
		if(elem.checked){
			stunt=elem.value;
		}
	}
	var bonusflat=parseInt(html.find('[name="bonusflat"]').val());
	var bonusdice=parseInt(html.find('[name="bonusdice"]').val());
	var penaltyflat=parseInt(html.find('[name="penaltyflat"]').val());
	var penaltydice=parseInt(html.find('[name="penaltydice"]').val());
        var bonus=0;
	const items=this.actor.data.items;
	var special="none";

	if(dataset.category == "attack"){
		var id = dataset._id;
		for(let temp of items){
			if(temp._id == id){
				var weapon=temp.data;
				var name=temp.name;
			}
		}
		//var weapon = this.actor.data.items[dataset.attindex].data;
		if(weapon.type == "melee"){
			    var abilityName="fighting";
		}else{
			    var abilityName="marksmanship";
		}
		special=weapon.special;
		if(special != "none"){
			bonus=parseInt(data.abilities[abilityName].special[special]);
		}
	}else{
    		var abilityName=dataset.ability;
		special=dataset.specialization;


		if(special != 'none' && special != null){
    		bonus=parseInt(data.abilities[abilityName].special[special]);
		}
	}
    var total=parseInt(data.abilities[abilityName].value);
    var keep=total;
    if(bonus == null){
	    bonus=0;
    }
    if(special == null){
	    special = 'none';
    }
    total+=parseInt(bonus);
    keep -= parseInt(penaltydice);


	var rerolldice=0;
	var reroll=false;

	//Now, go through modifiers and apply as needed.
	for(let currentitem of items){
		if(currentitem.type == 'feature'){
			for(let index in currentitem.data.modifiers){
				var mod=currentitem.data.modifiers[index];
				if(abilityName == mod.target && (mod.special == 'none' || special == mod.special)){
				//Listed bonus is relevant. Now to parse bonus 
					var change=0;
					try{
						change=new Roll(mod.effect,data).roll().total;
					}catch(error){
						console.log("bonus parse failure",error);
						change=0;
					}
					if(mod.type=="flat"){
						//This should be resolved as a flat bonus/penalty to the roll	
						bonusflat+=change;
					}else if(mod.type=="die"){
						//This should grant bonus dice instead
						total+=change;
					}else if(mod.type=="reroll"){
						//Reroll. 
						rerolldice+=change;
						reroll=true;
					}
					}
				}
			}

		}
		
	    if (total > (data.abilities[abilityName].value * 2)){
		    total=data.abilities[abilityName].value*2;
	    }
    //Bonus dice from interface can override normal limits
	total+=parseInt(bonusdice);
		//Now, to handle injuries, wounds,fatigue, and frustration
	console.log("debug",data);
	if(data.status.fatigue){
		//Units don't have any of this.
		if (data.status.fatigue.value) bonusflat -= data.status.fatigue.value;
		if (data.status.injuries.value) bonusflat -= data.status.injuries.value;
		if ( data.status.wounds.value) keep -= data.status.wounds.value;
	}
		if(dataset.category == "ability"){
			/**This is an ability roll(**/
		    var flavor="Rolling "+abilityName+", specialization: ";
	//Check for armor bulk. Applies penalty to Agility tests
	if(abilityName == 'agility'){
		penaltyflat+=data.combat.armorpenalty;
	}
			    flavor += special;
		}else if(dataset.category == "socialattack"){
			var flavor="Social Attack: ";
			flavor+=dataset.flavor;
			var damage=data.abilities[dataset.damage].value;
			flavor += " for "+damage+" damage"; 
			keep -= data.status.frustrations.value;
		}else if(dataset.category == "attack"){

				  
			if (weapon.damageability != "none"){
				var damage=data.abilities[weapon.damageability].value;
			}else{
				var damage=0;
			}
			console.log(weapon.damage,data);
			damage+=new Roll(weapon.damage,data).roll().total;
		if(weapon.quality==0){
			//Peasant weapon. 1 die penalty
		}else if(weapon.quality==2){
			//Superior weapon. +1 flat
			bonusflat+=1;
		}else if(weapon.quality==3){
			//Extraordinary weapon. +1 flat, +1 damage
			damage+=1;
			bonusflat+=1;
		}
		
		var flavor="Attacks with "+ name + " for " + damage + " damage";

	}

	if(this.actor.data.data.config.usestunts == "yes"){
		if(stunt=="0"){
			flavor += ", No Stunt";
		}else if(stunt=="1"){
			flavor += ", 1-Dot Stunt";
			bonusflat+=1+data.config.stuntbonus;
		}else if(stunt=="2"){
			bonusflat+=2+data.config.stuntbonus;
			flavor += ", 2-Dot Stunt";
		}else if(stunt=="2b"){
			bonusflat+=data.config.stuntbonus;
			total+=1;
			flavor += ", 2-Dot Stunt";
	}		

	}
	console.log("reroll dice",rerolldice);
	var temp;
	bonusflat-=penaltyflat;

	if(reroll && rerolldice == 0){
    temp= new Roll("(@total)d6kh(@keep)r1+@flat",{total: total, keep: keep,flat: bonusflat});
	}else if(reroll){
	temp= new Roll("(@total)d6kh(@keep)r(@limit)=1+@flat",{total: total, keep: keep,limit: rerolldice, flat: bonusflat});
	}else{
    temp= new Roll("(@total)d6kh(@keep)+@flat",{total: total, keep: keep,flat: bonusflat});
	}
    temp.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: flavor
      });
}
}
