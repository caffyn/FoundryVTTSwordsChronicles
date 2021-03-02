/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class SwordschroniclesActor extends Actor {

  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags;

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    if (actorData.type === 'character' || actorData.type == 'unit') this._prepareCharacterData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
	  console.log("preparing");


    // Initialize containers.
	var totalxp=0;
	var spentxp=0;
	var defbonus=0;
	var socialdefbonus=0;
	var sorcerypoints=0;
	var sorcerydefense=0;
	var bulk=0;
	var movebase=4;
	var movemultiplier=4;
	var stuntbonus=0;
	 //Initial health and composure calcs
    actorData.data.health.max=(actorData.data.abilities.endurance.value * 3);
    if(actorData.type == 'character'){
	    actorData.data.composure.max=(actorData.data.abilities.will.value * 3);
	    //Age-specific XP calcs
	    if(actorData.data.config.age=='youth'){
		    actorData.data.xp.chargen=160;
		    actorData.data.destiny.base=7;
	    }else if(actorData.data.config.age=='adolescent'){
		    actorData.data.xp.chargen=190;
		    actorData.data.destiny.base=6;
	    }else if(actorData.data.config.age=='youngadult'){
		    actorData.data.xp.chargen=240;
		    actorData.data.destiny.base=5;
	    }else if(actorData.data.config.age=='adult'){
		    actorData.data.xp.chargen=290;
		    actorData.data.destiny.base=4;
	    }else if(actorData.data.config.age=='middleage'){
		    actorData.data.xp.chargen=340;
		    actorData.data.destiny.base=3;
	    }else if(actorData.data.config.age=='old'){
		    actorData.data.xp.chargen=430;
		    actorData.data.destiny.base=2;
	    }else if(actorData.data.config.age=='veryold'){
		    actorData.data.xp.chargen=530;
		    actorData.data.destiny.base=1;
	    }else if(actorData.data.config.age=='venerable'){
		    actorData.data.xp.chargen=600;
		    actorData.data.destiny.base=0;
	    }
	    
	  //Destiny calcs
	  actorData.data.destiny.total=parseInt(actorData.data.destiny.base)+parseInt(actorData.data.destiny.bonus)-parseInt(actorData.data.destiny.invested);

	    }
	  //Set passive values for stats,start totalling XP costs
	  //Also doing XP calculations for abilities
	  var costoffset=2;
	  for(let i in actorData.data.abilities){
		  actorData.data.abilities[i].passive=actorData.data.abilities[i].value*4;
		  //Special handling for language
		  if(i.includes('language') && i != "language1"){
			//Languages have special handling
			//First language follows normal rules, further ones don't get the 2 "free" ranks
			costoffset=0;
		  }else{
			  costoffset=2;
		  }
		  if(!(i.includes('language')) && actorData.data.abilities[i].chargen_increase && actorData.data.abilities[i].value == 1){
			  //Value of 1 at chargen is worth 50 free XP
			spentxp -= 50;
		  }else if(actorData.data.abilities[i].chargen_increase && actorData.data.abilities[i].value > costoffset){
			  //First increase costs 10 at chargen
			  spentxp += (actorData.data.abilities[i].value-costoffset)*30 - 20;
		  }else if(actorData.data.abilities[i].value > costoffset){
			  //Post chargen increases, all costs are 30/level
			  spentxp += (actorData.data.abilities[i].value-costoffset)*30;
		  }
		  for(let special in actorData.data.abilities[i].special){
			spentxp += (actorData.data.abilities[i].special[special]) * 10;
		  }
		

	  }

	    // Iterate through items, allocating to containers
	    // let totalWeight = 0;
	    for (let i of actorData.items) {
	      let item = i.data;
	      i.img = i.img || DEFAULT_TOKEN;
	      // Append to features.
	      if (i.type === 'feature') {
		for(let j in i.data.modifiers){
			let currentmod=i.data.modifiers[j];
			//Dropdown switch can lead to invalid conditions. Fixing here, this is probably a temp fix
			if(currentmod.effecttype=="other" &&  !(currentmod.target in {'destiny':0,'combatdef':0,'xp':0,'health':0,'composure':0,'initiative':0,'socialinitiative':0,"socialdef": 0,'speed':0,'sprintmultiplier':0,"stuntbonus": 0})){
				console.log("debug: fixing invalid typing",currentmod);
				i.data.modifiers[j].target='health';
				currentmod=i.data.modifiers[j];
			}else if(currentmod.effecttype!="other" &&  (currentmod.target in {'destiny':0,'xp':0,'health':0,'composure':0,'initiative':0,'socialinitiative':0,'combatdef':0,'socialdef':0,'speed':0,'sprintmultiplier':0,"stuntbonus":0})){
				console.log("debug: fixing invalid typing",currentmod);
				i.data.modifiers[j].target='agility';
				currentmod=i.data.modifiers[j];
			}else if(currentmod.target=='stuntbonus'){
				try{
				var change=new Roll(currentmod.effect,actorData.data).roll().total;
				stuntbonus+=change;
				}catch(error){
					console.log("formula error",currentmod.effect,actorData);
				}
			}else if(currentmod.target=='xp'){
				try{
				var change=new Roll(currentmod.effect,actorData.data).roll().total;
				spentxp+=change;
				}catch(error){
					console.log("formula error",currentmod.effect,actorData);
				}
			}else if(currentmod.target=='destiny'){
				try{
				var change=new Roll(currentmod.effect,actorData.data).roll().total;
				actorData.data.destiny.total+=parseInt(change);
				}catch(error){
					console.log("formula error",currentmod.effect,actorData);
				}

			}else if(currentmod.type=='passive'){
				try{
				var change=new Roll(currentmod.effect,actorData.data).roll().total;
				actorData.data.abilities[currentmod.target].passive+=change;
				
				}catch(error){
					console.log("formula error",currentmod.effect,actorData);
				}

			}else if(currentmod.type=='passivepenalty'){
				try{
				var change=new Roll(currentmod.effect,actorData.data).roll().total;
				actorData.data.abilities[currentmod.target].passive-=change;
				
				}catch(error){
					console.log("formula error",currentmod.effect,actorData);
				}

			}
			//Now, to apply health and composure bonuses
			var newchange=0;

			if(currentmod.effect != ""){
			try{
			var change=new Roll(currentmod.effect,actorData.data).roll().total;
				if(currentmod.type=="flatpenalty"){
			           newchange= -1*parseInt(change);
				}else{

			           newchange= parseInt(change);
					}
			}catch(error){
				console.log("formula error",currentmod.effect,actorData);
			}}else{
				newchange=0;
			}
			if(currentmod.effecttype=="other" && currentmod.target=='health'){
				//Compute and add health bonus
				actorData.data.health.max+=newchange;
			}
			if(currentmod.effecttype=="other" && currentmod.target=='speed'){
					movebase+=newchange;
				console.log("applied speed");
				}
				if(currentmod.effecttype=="other" && currentmod.target=='sprintmultiplier'){
					movemultiplier+=newchange;
				}
				if(currentmod.effecttype=="other" && currentmod.target=='bulk'){
					actorData.data.combat.bulk.max+=newchange;
				}
				if(currentmod.effecttype=="other" && currentmod.target=='composure'){
					actorData.data.composure.max+=newchange;
				}
				if(currentmod.effecttype=="other" && currentmod.target=='combatdef'){
					//Compute and add combatdef bonus
					defbonus+=newchange;
				}
				if(currentmod.effecttype=="other" && currentmod.target=='socialdef'){
					//Compute and add socialdef bonus
					socialdefbonus+=newchange;
				}
				if(currentmod.effecttype=="magic" && currentmod.target=='sorcerypoint'){
					sorcerypoints+=newchange;
				}
				if(currentmod.effecttype=="magic" && currentmod.target=='sorcerydefense'){
					sorcerydefense+=newchange;
				}

			}
		      }
		      // Append to spells.
		      else if(i.type === 'weapon'){
			if(i.data.location=='equipped'){
				bulk+=i.data.bulk;
			}
		      }
		    }


		    //Health and composure final calcs

		    if(actorData.data.health.value > actorData.data.health.max){
		   actorData.data.health.value=actorData.data.health.max; 
	    }
	    if(actorData.type == 'character' && actorData.data.composure.value > actorData.data.composure.max){
		   actorData.data.composure.value=actorData.data.composure.max; 
	    }
		  //TODO: XP spending from abilities. Features have built-in costs where appropriate.
		totalxp += actorData.data.xp.earned;
		totalxp += actorData.data.xp.chargen;
		spentxp += actorData.data.xp.spent;
		actorData.data.xp.total=totalxp-spentxp;


	//Bulk and movement
		 actorData.data.combat.totalbulk=actorData.data.combat.bulk+bulk+actorData.data.combat.movement.bonus;
	 actorData.data.combat.movement.speed=movebase-Math.ceil(actorData.data.combat.totalbulk/2);
	 actorData.data.combat.movement.sprint=(movebase*movemultiplier)-actorData.data.combat.totalbulk;
	  if(actorData.data.combat.movement.speed < 1){
		  actorData.data.combat.movement.speed=1;
	  }
	  if(actorData.data.combat.movement.sprint < 4){
		  actorData.data.combat.movement.sprint=4;
	  }
	  console.log("setting stunt bonus",actorData.data.config.stuntbonus,stuntbonus);

	  console.log("def debug",actorData.data.combat);
	  actorData.data.config.stuntbonus=stuntbonus;

    actorData.data.sorcery.defense=actorData.data.abilities.cunning.value+actorData.data.abilities.endurance.value+actorData.data.abilities.will.value+actorData.data.sorcery.averting+sorcerydefense;
    actorData.data.sorcery.points.max=sorcerypoints+actorData.data.sorcery.points.bonus;
    actorData.data.sorcery.points.current=actorData.data.sorcery.points.max-actorData.data.sorcery.points.spent;

    actorData.data.combat.defense=actorData.data.abilities.agility.value+actorData.data.abilities.athletics.value+actorData.data.abilities.awareness.value+actorData.data.combat.defensebonus+defbonus+actorData.data.combat.bonusdef;
    actorData.data.socialcombat.defense=actorData.data.abilities.awareness.value+actorData.data.abilities.cunning.value+actorData.data.abilities.status.value+actorData.data.socialcombat.defensebonus+socialdefbonus;
	  console.log("type is",actorData.type);

if(actorData.type == 'unit'){
	console.log("set unit defenses",actorData);
	actorData.data.combat.discipline=actorData.data.combat.basediscipline;
	actorData.data.combat.rangeddefense=actorData.data.combat.defense;
	actorData.data.combat.meleedefense=actorData.data.combat.defense;
	if(actorData.data.formation.selected == 'checkered'){
		actorData.data.combat.discipline+=3;
		actorData.data.combat.rangeddefense+=5;
	}else if(actorData.data.formation.selected == 'firingline'){
		actorData.data.combat.defense-=3;
		actorData.data.combat.discipline+=3;
	}else if(actorData.data.formation.selected == 'pikeandshot'){
		actorData.data.combat.discipline+=3;
	}else if(actorData.data.formation.selected == 'phalanx'){
		actorData.data.combat.rangeddefense-=5;
		actorData.data.combat.meleedefense+=5;
	}else if(actorData.data.formation.selected == 'shieldwall'){
		actorData.data.combat.meleedefense+=5;
	}else if(actorData.data.formation.selected == 'wedge'){
		actorData.data.combat.rangeddefense-=5;
	}else if(actorData.data.formation.selected == 'mob'){
		actorData.data.combat.defense-=5;
		actorData.data.combat.meleedefense-=5;
		actorData.data.combat.rangeddefense-=5;
		actorData.data.combat.discipline+=6;
	}else if(actorData.data.formation.selected == 'tortoise'){
		actorData.data.combat.defense+=5;
		actorData.data.combat.meleedefense+=5;
		actorData.data.combat.rangeddefense+=5;
	}
	else {
		//Assuming it's battle formation
		console.log('Auto-setting to Battle formation');
		actorData.data.formation.selected = 'battle';
	}
	console.log("set unit defenses",actorData);
}

  }
}
