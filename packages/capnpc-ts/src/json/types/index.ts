export interface INode {
  id: string;
  displayName: string;
  displayNamePrefixLength: number;
  scopeId: string;
  parameters: INode_Parameter[];
  isGeneric: boolean;
  nestedNodes: INode_NestedNode[];
  annotations: IAnnotation[];
  file?: 'void';
  struct?: INode_Struct;
  enum?: INode_Enum;
  interface?: INode_Interface;
  const?: INode_Const;
  annotation?: INode_Annotation;
}

export enum Node_Which {
  FILE,
  STRUCT,
  ENUM,
  INTERFACE,
  CONST,
  ANNOTATION,
}

export interface INode_Struct {
  dataWordCount: number;
  pointerCount: number;
  preferredListEncoding: string;
  isGroup: boolean;
  discriminantCount: number;
  discriminantOffset: number;
  fields: IField[];
}

export interface INode_Enum {
  enumerants: IEnumerant[];
}

export interface INode_Interface {
  methods: IMethod[];
  superclasses: ISuperclass[];
}

export interface INode_Const {
  type: IType;
  value: IValue;
}

export interface INode_Annotation {
  type: IType;
  targetsFile: boolean;
  targetsConst: boolean;
  targetsEnum: boolean;
  targetsEnumerant: boolean;
  targetsStruct: boolean;
  targetsField: boolean;
  targetsUnion: boolean;
  targetsGroup: boolean;
  targetsInterface: boolean;
  targetsMethod: boolean;
  targetsParam: boolean;
  targetsAnnotation: boolean;
}

export interface INode_Parameter {
  name: string;
}

export interface INode_NestedNode {
  name: string;
  id: string;
}

export interface IField {
  name: string;
  codeOrder: number;
  annotations: IAnnotation[];
  discriminantValue: number;
  slot?: IField_Slot;
  group?: IField_Group;
  ordinal?: IField_Ordinal;
}

export enum Field_Which {
  SLOT,
  GROUP,
  ORDINAL,
}

export interface IField_Slot {
  offset: number;
  type: IType;
  defaultValue: IValue;
  hadExplicitDefault: boolean;
  noDiscriminant: 65535;
}

export interface IField_Group {
  typeId: string;
}

export interface IField_Ordinal {
  implicit?: 'void';
  explicit?: number;
}

export enum Field_Ordinal_Which {
  IMPLICIT,
  EXPLICIT,
}

export interface IEnumerant {
  name: string;
  codeOrder: number;
  annotations: IAnnotation[];
}

export interface ISuperclass {
  id: string;
  brand: IBrand;
}

export interface IMethod {
  name: string;
  codeOrder: number;
  implicitParameters: INode_Parameter[];
  paramStructType: string;
  paramBrand: IBrand;
  resultStructType: string;
  resultBrand: IBrand;
  annotations: IAnnotation[];
}

export interface IType {
  void?: 'void';
  bool?: 'void';
  int8?: 'void';
  int16?: 'void';
  int32?: 'void';
  int64?: 'void';
  uint8?: 'void';
  uint16?: 'void';
  uint32?: 'void';
  uint64?: 'void';
  float32?: 'void';
  float64?: 'void';
  text?: 'void';
  data?: 'void';
  list?: IType_List;
  enum?: IType_Enum;
  struct?: IType_Struct;
  interface?: IType_Interface;
  anyPointer?: IType_AnyPointer;
}

export enum Type_Which {
  VOID,
  BOOL,
  INT8,
  INT16,
  INT32,
  INT64,
  UINT8,
  UINT16,
  UINT32,
  UINT64,
  FLOAT32,
  FLOAT64,
  TEXT,
  DATA,
  LIST,
  ENUM,
  STRUCT,
  INTERFACE,
  ANY_POINTER,
}

export interface IType_List {
  elementType: IType;
}

export interface IType_Enum {
  typeId: string;
  brand: IBrand;
}

export interface IType_Struct {
  typeId: string;
  brand: IBrand;
}

export interface IType_Interface {
  typeId: string;
  brand: IBrand;
}

export interface IType_AnyPointer {
  unconstrained?: IType_AnyPointer_Unconstrained;
  parameter?: IType_AnyPointer_Parameter;
  implicitMethodParameter?: IType_AnyPointer_ImplicitMethodParameter;
}

export interface IType_AnyPointer_Unconstrained {
  anyKind?: 'void';
  struct?: 'void';
  list?: 'void';
  capability?: 'void';
}

export enum Type_AnyPointer_Unconstrained_Which {
  ANY_KIND,
  STRUCT,
  LIST,
  CAPABILITY,
}

export interface IType_AnyPointer_Parameter {
  scopeId: string;
  parameterIndex: number;
}

export interface IType_AnyPointer_ImplicitMethodParameter {
  parameterIndex: number;
}

export interface IBrand {
  scopes: IBrand_Scope[];
}

export interface IBrand_Scope {
  scopeId: string;
  bind?: IBrand_Binding[];
  inherit?: 'void';
}

export enum Brand_Scope_Which {
  BIND,
  INHERIT,
}

export interface IBrand_Binding {
  unbound?: 'void';
  type?: IType;
}

export enum Brand_Binding_Which {
  UNBOUND,
  TYPE,
}

export interface IValue {
  void?: 'void';
  bool?: boolean;
  int8?: number;
  int16?: number;
  int32?: number;
  int64?: string;
  uint8?: number;
  uint16?: number;
  uint32?: number;
  uint64?: string;
  float32?: number;
  float64?: number;
  text?: string;
  data?: string;
  list?: '<opaque pointer>';
  enum?: number;
  struct?: '<opaque pointer>';
  interface?: 'void';
  anyPointer?: '<opaque pointer>';
}

export enum Value_Which {
  VOID,
  BOOL,
  INT8,
  INT16,
  INT32,
  INT64,
  UINT8,
  UINT16,
  UINT32,
  UINT64,
  FLOAT32,
  FLOAT64,
  TEXT,
  DATA,
  LIST,
  ENUM,
  STRUCT,
  INTERFACE,
  ANY_POINTER,
}

export interface IAnnotation {
  id: string;
  brand: IBrand;
  value: IValue;
}

export enum ElementSize {
  EMPTY,
  BIT,
  BYTE,
  TWO_BYTES,
  FOUR_BYTES,
  EIGHT_BYTES,
  POINTER,
  INLINE_COMPOSITE,
}

export interface ICapnpVersion {
  major: number;
  minor: number;
  micro: number;
}

export interface ICodeGeneratorRequest {
  capnpVersion: ICapnpVersion;
  nodes: INode[];
  requestedFiles: ICodeGeneratorRequest_RequestedFile[];
}

export interface ICodeGeneratorRequest_RequestedFile {
  id: string;
  filename: string;
  imports: ICodeGeneratorRequest_RequestedFile_Import[];
}

export interface ICodeGeneratorRequest_RequestedFile_Import {
  id: string;
  name: string;
}
