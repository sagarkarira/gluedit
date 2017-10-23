const BASE = 256;


/** insertion order : a,b,x,h,m,n

a  b  x 

comp(a,b) ==>  -1
comp(b,x) ==>  
do untill get postive
/** compare functions */



function comparePosition(p1, p2) {
    for (let i = 0; i < Math.min(p1.length, p2.length); i++) {
        const comp = compareIdentifier(p1[i], p2[i]);
        if (comp !== 0) {
            return comp;
        }
    }
    if (p1.length < p2.length) {
        return - 1;
    } else if (p1.length > p2.length) {
        return 1;
    } else {
        return 0;
    }
}

function compareIdentifier(i1, i2) {
    if (i1.digit < i2.digit) {
        return -1;
    } else if (i1.digit > i2.digit) {
        return 1;
    } else {
        if (i1.site < i2.site) {
            return -1;
        } else if (i1.site > i2.site) {
            return 1;
        } else {
            return 0;
        }
    }
}

/** [generatePositionBetween description] */

function generatePositionBetween(position1, position2, site) {
    // Get either the head of the position, or fallback to default value
    const head1 = head(position1) || create(0, site);
    const head2 = head(position2) || create(256, site);
    if (head1.digit !== head2.digit) {
        // Case 1: Head digits are different
        const n1 = fromIdentifierList(position1);
        const n2 = fromIdentifierList(position2);
        const delta = subtractGreaterThan(n2, n1);
        // Increment n1 by some amount less than delta
        const next = increment(n1, delta);
        return toIdentifierList(next, position1, position2, site);
    } else {
        if (head1.site < head2.site) {
            // Case 2: Head digits are the same, sites are different
            return cons(head1,
                generatePositionBetween(rest(position1), [], site));
        } else if (head1.site === head2.site) {
            // Case 3: Head digits and sites are the same
            return cons(head1,
                generatePositionBetween(rest(position1), rest(position2), site));
        } else {
            throw new Error("invalid site ordering");
        }
    }
}




function fromIdentifierList(identifiers) {
    return identifiers.map(ident => ident.digit);
}

function subtractGreaterThan(n1, n2) {
    var carry = 0;
    var diff = Array(Math.max(n1.length, n2.length));
    for (var i = diff.length - 1; i >= 0; i--) {
        var d1 = (n1[i] || 0) - carry;
        var d2 = (n2[i] || 0);
        if (d1 < d2) {
            carry = 1;
            diff[i] = d1 + BASE - d2;
        }
        else {
            carry = 0;
            diff[i] = d1 - d2;
        }
    }
    return diff;
}

function increment(n1, delta) {
    const firstNonzeroDigit = delta.findIndex(x => x !== 0);
    const inc = delta.slice(0, firstNonzeroDigit).concat([0, 1]);

    const v1 = add(n1, inc);
    const v2 = v1[v1.length - 1] === 0 ? add(v1, inc) : v1;
    return v2;
}

function add(n1, n2) {
    let carry = 0;
    const diff =  Array(Math.max(n1.length, n2.length));
    for (let i = diff.length - 1; i >= 0; i--) {
        const sum = (n1[i] || 0) + (n2[i] || 0) + carry;
        carry = Math.floor(sum / BASE);
        diff[i] = (sum % BASE);
    }
    if (carry !== 0) {
        throw new Error("sum is greater than one, cannot be represented by this type");
    }
    return diff;
}

function fromIdentifierList(identifiers) {
    return identifiers.map(ident => ident.digit);
}

function toIdentifierList(n, before, after, creationSite) {
    // Implements the constructPosition rules from the Logoot paper
    return n.map((digit, index) => {
        if (index === n.length - 1) {
            return create(digit, creationSite);
        } else if (index < before.length && digit === before[index].digit) {
            return create(digit, before[index].site);
        } else if (index < after.length && digit === after[index].digit) {
            return create(digit, after[index].site);
        } else {
            return create(digit, creationSite);
        }
    });
}

function create(digit, site) {
    const obj = { digit, site };
    Object.freeze(obj);
    return obj;
}

function cons(head, rest) {
    return [head].concat(rest);
}

function head(list) {
    return list[0];
}

function rest(list) {
    return list.slice(1);
}




let p1 = [{
    site : 0, 
    digit : 1    
}];
   
let p2 =  [{
    site : 1 , 
    digit : 1
}];


console.log(generatePositionBetween(p1, p2, 0));

let charMap = [];
let value = ""; // text area value string
let siteNumber = 0;
if (charMap.length !== 0 ) {
    siteNumber = charMap[charMap.length - 1].position.site;
}

// inserting character ch at the index cursor postion.
function localInsertChar(ch, index) {
    
    if (index === 0 && charMap[index] === undefined) {
        let beginPosition = [{
            site : siteNumber, 
            digit : 1
        }];
        
        charMap[index] = {
            value : ch, 
            position : beginPosition
        };
        siteNumber++;
    } 
    //inserting new characters
    else if (charMap[index+1] === undefined ) {
        charMap[index] = {
            value : ch, 
            position : {
                site : siteNumber, 
                digit : 1
            }
        };
        siteNumber++;
    } 

    // inserting characters in b/w other characters
    else if (charMap[index-1] !== undefined 
        && charMap[index+1] !== undefined 
        && charMap[index] === undefined
        ) {
        let position1 = charMap[index-1].position;
        let position2 = charMap[index-1].position;
        let siteNumber = position1.site;

        charMap[index] = {
            value : ch, 
            position : generatePositionBetween(position1, position2, siteNumber )
        }
    } 
    // writing before the first 0th index. Beginning of document when 
    // 0th index is present
    
    else if (index === 0 && charMap[1] !== undefined ) {
        let position2 = charMap[1]
        charMap[index] = {
            value : ch, 
            position : generatePositionBetween([], position2, siteNumber )
        }
    }
    // emit remote insertion
} 

//delete character at the index cursor postion
function localDeleteChar(ch, index) {
    //emit remote deletion  
    delete charMap[index];
}


function insertRemoteChar(chObject) {
    let position = chObject.position;
    let ch = chObject.value;
    // insert when no characters are present
    
    // insert b/w
    // insert at the last
    
    for (var index in charMap) {
        if (comparePosition(position, charMap[index].position) >= 0) {
            // insert ch at index 
            // editor.replaceRange(ch, editor.posFromIndex(index));
            charMap.splice(index, 0, chObject);
            return;
        }
    }

    //insert ch at last index
    charMap.push(chObject);
}

function deleteRemoteChar(chObject) {
    let position = chObject.position;
    let ch = chObject.value;
    
    for (var index in charMap) {
        if (comparePosition(position, charMap[index].position) === 0 ) {
            // delete ch at index
            // let from = editor.posFromIndex(index);
            // let to = editor.posFromIndex(index + 1);
            // editor.replaceRange('', from, to);
            charMap.splice(index, 1);
            return;
        }
    }
    console.log('Cant find delete character');
}