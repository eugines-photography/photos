export type Photo = {id:string,title:string,src:string,tags:string[],createdAt:number,sample:boolean};
export const samples: Photo[] = [
  {id:'s1', title:'Where the mountains breathe', src:'/photos/mountains.jpg', tags:['nature','mountains','travel'],createdAt:9,sample:true},
  {id:'s2', title:'A slower kind of morning', src:'/photos/forest.jpg',tags:['nature','forest'],createdAt:8,sample:true},
  {id:'s3', title:'Somewhere along the coast', src:'/photos/coast.jpg',tags:['ocean','travel'],createdAt:7,sample:true},
  {id:'s4', title:'The long way home', src:'/photos/lake.jpg',tags:['nature','mountains','travel'],createdAt:6,sample:true},
  {id:'s5', title:'In the quiet of the city', src:'/photos/city.jpg',tags:['city','architecture'],createdAt:5,sample:true},
  {id:'s6', title:'Chasing the last light', src:'/photos/fields.jpg',tags:['nature','golden hour'],createdAt:4,sample:true},
  {id:'s7', title:'Salt in the air', src:'/photos/ocean.jpg',tags:['ocean','nature'],createdAt:3,sample:true},
  {id:'s8', title:'Room to wander', src:'/photos/sunrise.jpg',tags:['nature','golden hour'],createdAt:2,sample:true},
  {id:'s9', title:'A different perspective', src:'/photos/architecture.jpg',tags:['architecture','city'],createdAt:1,sample:true},
];
