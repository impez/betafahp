const randomConsistencyIndex = {
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49,
    11: 1.51,
    12: 1.48,
    13: 1.56,
    14: 1.57,
    15: 1.59
}

const getMatrixOfOnes = size => {
    let matrix = [];
  
    for(let i=0; i<size; i++){
      matrix[i] = [];
      for(let j=0; j<size; j++){
          matrix[i][j] = [1,1,1];
      }
    }
  
    return matrix;
}

const getConsistencyRatio = (matrix, weights) => {
    if(matrix.length === 2){
        return 0;
    }
    else{
        let A3 = matrixProduct(matrix, weights.map(weight=>[weight]));
        A3 = A3.flat();
        const A4 = [];

        for(let i=0; i<weights.length; i++){
            A4.push(A3[i]/weights[i]);
        }

        const lambdaMax = (A4.reduce((a,b) => {
            return a+b;
        }, 0))/A4.length

        const CI = (lambdaMax - A4.length)/(A4.length - 1);
        return CI/randomConsistencyIndex[A4.length];
    }
}

const matrixProduct = (matrix1, matrix2) => {
    let result = []
    for (let X = 0; X < matrix1.length; X++) {
      let newRow = []
      for (let Y = 0; Y < matrix2[0].length; Y++) {
        let newDotProd = 0
  
        for (let i = 0; i < matrix1[X].length; i++) {
          newDotProd += matrix1[X][i] * matrix2[i][Y]
  
        }
        newRow.push(newDotProd)
      }
      result.push(newRow) // should have pushed m times
    }
  
    return result
}

const getRandomChoiceFromTriangle = (a, c, b) => {
    if(a>b){
      let temp = b;
      b = a;
      a = temp;
    }

    let u = Math.random();
    let f;
  
    if(a===b){
      return a;
    }
    else{
      f = (c-a)/(b-a);
    }

    return (0<u && u<f) ? (a+Math.sqrt(u*(b-a)*(c-a)))
        :  (f<u && u<1) ? (b-Math.sqrt((1-u)*(b-a)*(b-c)))
        :  (u===0)      ? a
        :  b // u === 1
}

const getCrispyValuesMatrix = (matrix) => {
    const newMatrix = [];

    for(let i=0; i<matrix.length; i++){
        newMatrix[i] = [];
        for(let j=0; j<matrix.length; j++){
            newMatrix[i][j] = matrix[i][j]; // Cloning new matrix so we dont play
        }                                   // with origin matrix reference 
    }

    for(let i=0; i<matrix.length; i++){
        newMatrix[i][i] = 1;
        for(let j=i+1; j<matrix.length; j++){
            const generatedValue = getRandomChoiceFromTriangle(matrix[i][j][0],matrix[i][j][1],matrix[i][j][2]);
            newMatrix[i][j] = toAhpValue(generatedValue);
            newMatrix[j][i] = 1/newMatrix[i][j];
        }
    }

    return newMatrix;
}

const getMatrixWeightsAndCr = (matrix) => {
    const n = matrix.length;
    let weights = [];
    let sum = 0;
  
    for(let i=0; i<matrix.length; i++){
      let mul = 1;
      for(let j=0; j<matrix.length; j++){
        mul *= matrix[i][j];
      }
      weights.push(Math.pow(mul, 1/n));
      sum += weights[i];
    }
  
    weights = weights.map(weight => weight/sum);

    return {
        weights,
        cr: getConsistencyRatio(matrix, weights)
    }
}

const generateDataBasedOnFuzzyMatrixNtimes = (matrix, n) => {
    const data = [];
    const avgWs = [];
    let mul = 1;
    let sum = 0;

    for(let i=0; i<n; i++){
        const mx = getCrispyValuesMatrix(matrix);
        data.push(getMatrixWeightsAndCr(mx));
    }

    for(item of data){
        mul *= item.cr
    }
    const x = mul;

    let weightsAmount = data[0].weights.length;
    for(let i=0; i<weightsAmount; i++){
        mul=1;
        for(let j=0; j<n; j++){
            mul *= data[j].weights[i]
        }
        avgWs.push(Math.pow(mul, 1/n));
    }

    return{
        avgCrs: Math.pow(x, 1/n),
        avgWeights: avgWs
    }
}

const toAhpValue = x => x < 1 ? 1/(-x+2) : x

class FuzzyAHP{
    constructor(variants, criterias){
        this.variants = [...variants]
        this.criterias = [...criterias];
        this.criteriasMatrix = [];
        this.variantsMatrix = [];
        this.criteriasData = {
            names: [...this.criterias],
            weights: [],
            consistencyRatio: null
        }
        this.variantsData = {
            names: [...this.variants],
            weights: [],
            consistencyRatios: []
        }

        this.resetMatrixes();
    }

    resetMatrixes(){
        this.criteriasMatrix = getMatrixOfOnes(this.criterias.length);

        for(const criteria of this.criterias){
            this.variantsMatrix[criteria] = getMatrixOfOnes(this.variants.length);
            this.variantsData.weights[criteria] = [];
            this.variantsData.consistencyRatios[criteria] = []; 
        }
    }

    makePairwiseComparisons(rates, criteriaComparison){
        if(criteriaComparison !== undefined){
            for(let i=0; i<this.variantsMatrix[criteriaComparison].length; i++){
                for(let j=i+1; j<this.variantsMatrix[criteriaComparison].length; j++){
                    this.variantsMatrix[criteriaComparison][i][j] = rates.shift();
                }
            }
        }
        else{
            for(let i=0; i<this.criteriasMatrix.length; i++){
                for(let j=i+1; j<this.criteriasMatrix.length; j++){
                    this.criteriasMatrix[i][j] = rates.shift();
                }
            }
        }
    }

    weightsAndCR(){
        let data = generateDataBasedOnFuzzyMatrixNtimes(this.criteriasMatrix, 100);
        let sum = 0;

        for(const wgt of data.avgWeights){
            sum += wgt;
        }

        data.avgWeights = data.avgWeights.map(weight => weight/sum);
        this.criteriasData.weights = data.avgWeights;
        this.criteriasData.consistencyRatio = data.avgCrs;

        for(const criteria of this.criterias){
            let vdata = generateDataBasedOnFuzzyMatrixNtimes(this.variantsMatrix[criteria], 100);
            let vsum = 0;

            for(const wgt of vdata.avgWeights){
                vsum += wgt;
            }

            vdata.avgWeights = vdata.avgWeights.map(weight => weight/vsum);
            this.variantsData.weights[criteria] = vdata.avgWeights;
            this.variantsData.consistencyRatios[criteria] = vdata.avgCrs;
        }
    }

    ranking(){
        const correspondingWeights = [];
        const rates = [];

        for(let i=0; i<this.variants.length; i++){
            correspondingWeights[i] = [];
            for(const criteria of this.criterias){
                correspondingWeights[i].push(this.variantsData.weights[criteria][i]);
            }
        }

        for(let i=0; i<correspondingWeights.length; i++){
            let sum=0;
            for(let j=0; j<this.criteriasData.weights.length; j++){
                sum += this.criteriasData.weights[j]*correspondingWeights[i][j];
            }
            rates.push(sum);
        }

        const obj = {}; 

        for(const variant of this.variants){
            let i=0;
            obj[variant] = rates.shift();
        }

        return {
            criterias: this.criterias,
            criteriasChoiceCr: this.criteriasData.consistencyRatio,
            alternativesChoicesCrs: Object.values(this.variantsData.consistencyRatios),
            rank: obj
        }; 
    }
}

module.exports = {
    FAHP: FuzzyAHP
}

/*
const ahp = new FuzzyAHP(['W1', 'W2', 'W3'], ['K1', 'K2', 'K3']);
ahp.makePairwiseComparisons([[-1,1,3],[-1,1,3],[-1,1,3]])
ahp.makePairwiseComparisons([[-1,1,3],[-1,1,3],[-1,1,3]], 'K1');
ahp.makePairwiseComparisons([[-1,1,3],[-1,1,3],[-1,1,3]], 'K2');
ahp.makePairwiseComparisons([[-1,1,3],[-1,1,3],[-1,1,3]], 'K3');
ahp.weightsAndCR();

console.log(ahp);
console.log(ahp.ranking());
*/