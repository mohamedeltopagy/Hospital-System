interface Patient {
  id: number;
  name: string;
  expectedDuration: number; // in minutes
}

interface Doctor {
  id: number;
  name: string;
}

interface Particle {
  position: number[];
  velocity: number[];
  bestPosition: number[];
  bestFitness: number;
}

export class PSOOptimizer {
  private numParticles = 30;
  private maxIter = 100;
  private w = 0.5; // inertia weight
  private c1 = 1.5; // cognitive constant
  private c2 = 1.5; // social constant

  constructor(private patients: Patient[], private doctors: Doctor[]) {}

  // The goal is to balance the total duration of appointments assigned to each doctor.
  // Fitness = Variance of total times (Lower is better).
  private evaluateFitness(position: number[]): number {
    const doctorLoads = new Array(this.doctors.length).fill(0);
    
    for (let i = 0; i < this.patients.length; i++) {
      // Map continuous position to discrete doctor index
      let docIdx = Math.floor(Math.abs(position[i])) % this.doctors.length;
      if (isNaN(docIdx) || docIdx === undefined) docIdx = 0;
      doctorLoads[docIdx] += this.patients[i].expectedDuration;
    }

    // Calculate Variance
    const mean = doctorLoads.reduce((a, b) => a + b, 0) / doctorLoads.length;
    let variance = 0;
    for (let load of doctorLoads) {
      variance += Math.pow(load - mean, 2);
    }
    return variance;
  }

  public optimize() {
    if (this.doctors.length === 0 || this.patients.length === 0) {
      return { assignments: [], fitness: 0, doctorLoads: [] };
    }

    const n = this.patients.length;
    const particles: Particle[] = [];
    let globalBestPosition: number[] = new Array(n).fill(0);
    let globalBestFitness = Infinity;

    // Initialize particles
    for (let i = 0; i < this.numParticles; i++) {
      const position = [];
      const velocity = [];
      for (let j = 0; j < n; j++) {
        position.push(Math.random() * this.doctors.length);
        velocity.push((Math.random() - 0.5) * 2);
      }
      
      const fitness = this.evaluateFitness(position);
      particles.push({
        position: [...position],
        velocity: [...velocity],
        bestPosition: [...position],
        bestFitness: fitness
      });

      if (fitness < globalBestFitness) {
        globalBestFitness = fitness;
        globalBestPosition = [...position];
      }
    }

    // Optimization Loop
    for (let iter = 0; iter < this.maxIter; iter++) {
      for (const p of particles) {
        for (let j = 0; j < n; j++) {
          const r1 = Math.random();
          const r2 = Math.random();
          
          p.velocity[j] = this.w * p.velocity[j] 
                        + this.c1 * r1 * (p.bestPosition[j] - p.position[j])
                        + this.c2 * r2 * (globalBestPosition[j] - p.position[j]);
                        
          p.position[j] += p.velocity[j];
          
          // Keep positions within bounds
          if (p.position[j] < 0) p.position[j] = 0;
          if (p.position[j] >= this.doctors.length) p.position[j] = this.doctors.length - 0.01;
        }

        const fitness = this.evaluateFitness(p.position);
        if (fitness < p.bestFitness) {
          p.bestFitness = fitness;
          p.bestPosition = [...p.position];
        }

        if (fitness < globalBestFitness) {
          globalBestFitness = fitness;
          globalBestPosition = [...p.position];
        }
      }
    }

    const finalLoads = new Array(this.doctors.length).fill(0);
    // Map globalBestPosition back to doctor assignments
    const assignments = this.patients.map((patient, index) => {
      const docIdx = Math.floor(Math.abs(globalBestPosition[index])) % this.doctors.length;
      finalLoads[docIdx] += patient.expectedDuration;
      return {
        patient,
        assignedDoctor: this.doctors[docIdx]
      };
    });

    return {
      assignments,
      fitness: globalBestFitness,
      doctorLoads: this.doctors.map((d, i) => ({ doctor: d, totalLoad: finalLoads[i] }))
    };
  }
}
